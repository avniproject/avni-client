"""Writes the made-up images the Kotlin tests send through the app's code, into one folder.

Usage: `python tests/write_test_images.py OUT_DIR`. Besides the images it writes
`jpeg64.rgb`, Pillow's decode of `jpeg64.jpg` as raw RGB bytes, which the tests compare with
Android's decoder.
"""

import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from images import jpeg, oral_like, to_pil  # noqa: E402


def write_test_images(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    plain = oral_like(3)
    pale = oral_like(3, patch=140)
    (out / "plain.jpg").write_bytes(jpeg(plain))
    (out / "pale.jpg").write_bytes(jpeg(pale))

    # Orientation 6 means "rotate 90 degrees clockwise to display", so the stored pixels are the
    # upright image turned a quarter turn the other way.
    stored = np.ascontiguousarray(np.rot90(pale, 1))
    (out / "upright.jpg").write_bytes(jpeg(pale))
    (out / "rotated6.jpg").write_bytes(jpeg(stored, exif_orientation=6))

    rgba = to_pil(pale).convert("RGBA")
    rgba.putalpha(Image.new("L", rgba.size, 200))
    rgba.save(out / "alpha.png")
    to_pil(pale).convert("L").save(out / "grey.jpg", "JPEG", quality=95)
    (out / "garbage.jpg").write_bytes(b"this is not an image" * 20)

    # A sweep of pale-disc sizes and strengths: the folds should split on some of them.
    sizes = [0, 40, 60, 80, 100, 120, 140, 160, 180, 200]
    for i in range(20):
        sweep = oral_like(i, sizes[i % len(sizes)], 0.5 + 0.5 * (i % 2))
        (out / f"sweep{i:02d}.jpg").write_bytes(jpeg(sweep))

    small = to_pil(oral_like(5, patch=20)).resize((64, 64), Image.BICUBIC)
    buffer = io.BytesIO()
    small.save(buffer, "JPEG", quality=90)
    (out / "jpeg64.jpg").write_bytes(buffer.getvalue())
    decoded = Image.open(io.BytesIO(buffer.getvalue())).convert("RGB")
    (out / "jpeg64.rgb").write_bytes(np.asarray(decoded, dtype=np.uint8).tobytes())


if __name__ == "__main__":
    write_test_images(Path(sys.argv[1]))
