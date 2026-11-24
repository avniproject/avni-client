"""Turns a handoff folder of RSA-wrapped folds into the staging folder the `real` image reads.

The handoff folder holds the three encrypted folds (`<sha256>.bin`), a `manifest.json` whose
`models` list names each fold's original file, `wrapped_keys/<sha256>.key.enc.b64` (each fold's
AES-256 key wrapped with RSA-4096-OAEP, SHA-256) and `keys/private_key.pem`. The blobs already
have the app's layout, `[12-byte IV][ciphertext][16-byte GCM tag]`, so they are copied as they are.

The output folder gets the three blobs, a `manifest.json` with the `items` that
`tools/edge-model/encrypt-model.js` writes, and a `keys.json` mapping each sha256 to its base64
AES key. Each key is checked by decrypting its fold and comparing the plaintext's SHA-256 with the
blob's name. The private key, the wrapped keys and the handoff tables are not copied, so they stay
out of the image; `keys.json` does go into the image, as the server needs it.

Usage: `python unwrap_folds.py HANDOFF_DIR OUT_DIR [OVERRIDE_JSON]`. Needs `cryptography`.
OVERRIDE_JSON defaults to `tools/edge-model/tanuh-ensemble-override.json`.
"""

import base64
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# The tag in the original file name, e.g. `mvit2_fold1_6_latest_traced_(model6).onnx`, to the fold's
# name, as `TANUH_ENSEMBLE_FOLDS` in makefiles/tanuh.mk maps them.
FOLD_NAMES = {"model6": "mvit2_fold1_6", "model8": "mvit2_fold1_8", "model8-2": "mvit2_fold2_8"}
DEFAULT_OVERRIDE = Path(__file__).resolve().parent.parent / "edge-model" / "tanuh-ensemble-override.json"


def main(handoff: Path, out: Path, override: Path) -> None:
    manifest = json.loads((handoff / "manifest.json").read_text())
    private_key = serialization.load_pem_private_key((handoff / "keys" / "private_key.pem").read_bytes(), None)
    payload = json.loads(override.read_text())
    oaep = padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)

    out.mkdir(parents=True, exist_ok=True)
    items, keys = [], {}
    for model in manifest["models"]:
        tag = re.search(r"\((model[^)]*)\)", model["original_filename"])
        if not tag or tag.group(1) not in FOLD_NAMES:
            sys.exit(f"cannot tell which fold {model['original_filename']} is")
        name, sha = FOLD_NAMES[tag.group(1)], model["plaintext_sha256"]

        wrapped = base64.b64decode((handoff / "wrapped_keys" / f"{sha}.key.enc.b64").read_text().strip())
        key = private_key.decrypt(wrapped, oaep)
        blob = (handoff / f"{sha}.bin").read_bytes()
        plaintext = AESGCM(key).decrypt(blob[:12], blob[12:], None)
        if len(key) != 32 or hashlib.sha256(plaintext).hexdigest() != sha:
            sys.exit(f"{name}: the key does not decrypt {sha}.bin to a file with that SHA-256")

        shutil.copyfile(handoff / f"{sha}.bin", out / f"{sha}.bin")
        items.append({
            "name": name,
            "category": "edgeModel",
            "sha256": sha,
            "contentKey": f"models/{sha}.bin",
            "needsKey": True,
            "payload": payload,
            "blob": f"{sha}.bin",
        })
        keys[sha] = base64.b64encode(key).decode()
        print(f"{name}: {model['original_filename']}, key checked")

    items.sort(key=lambda item: item["name"])
    (out / "manifest.json").write_text(json.dumps({"items": items}, indent=2) + "\n")
    keys_file = out / "keys.json"
    keys_file.write_text(json.dumps(keys, indent=2) + "\n")
    keys_file.chmod(0o600)  # the AES keys: owner only, like the private key they were unwrapped with


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__.split("\n\n")[-1])
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]) if len(sys.argv) == 4 else DEFAULT_OVERRIDE)
