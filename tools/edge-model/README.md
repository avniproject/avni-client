# Edge-model build flow (TANUH interim)

This directory holds the offline encryption tool and per-build artefacts for the on-device
edge-model integration in the `tanuh` Gradle flavour. It exists so that a TANUH developer can
produce a signed APK with their proprietary model bundled and AES-GCM-encrypted, on their own
machine, in two commands.

The on-device runtime is **ONNX Runtime Mobile** (`com.microsoft.onnxruntime:onnxruntime-android`,
tanuh-scoped). The shipped models are **ONNX exports** of the clinically-validated MViT2 fold
ensemble. ONNX Runtime is used in place of PyTorch Mobile 1.13.1 because its 64-bit native libs
are 16 KB-page-aligned and therefore Google-Play-compliant for targetSdk 35, whereas PyTorch
Mobile's prebuilt `libpytorch_jni.so` is 4 KB-aligned and rejected (avni-product-ops#186). It is
a **stock Maven Central artifact** — no custom AAR build or local-maven hosting is required.
Because the runtime *math* changes from PyTorch to ONNX Runtime, a numerical-equivalence check
against the validated TorchScript ensemble + TANUH AI sign-off gate the clinical re-validation
scope (tracked in the issue).

The full design is documented at `~/.claude/plans/composed-tumbling-bachman.md`.

## Threat model — read first

This is the **interim** build. The encrypted model **and the AES key both ship in the same
APK** (the key lives in `registry.json` inside `assets/models/`). That is *obfuscation*,
not the §5.1 protection in `~/.claude/plans/frolicking-pondering-marble.md`:

- It defeats casual extraction (`unzip the APK, grab the .pt` no longer works).
- It does *not* defeat a determined reverser who reads the bundled key and decrypts.

There is also a brief **on-disk plaintext window** at load time: ONNX Runtime's
`OrtEnvironment.createSession(path)` loads from a file path, so the AES decrypt is streamed
directly into the app's private `filesDir/<modelKey>.model.tmp` (mode 0600 via
`MODE_PRIVATE`), the session is created, and the file is deleted in a `finally` block.
Plaintext exists on disk for the duration of decrypt + `createSession` (low single-digit
seconds for an 18 MB model). The streaming decrypt — rather than first materialising the
plaintext in a `ByteBuffer.allocateDirect` and then writing it out — keeps the JVM-heap
peak under 64 KB, which lets the bridge run inside the default ~96 MB heap without
needing `largeHeap`. The longer disk window doesn't change the threat model: a reverser
with the APK already has the AES key and decrypts offline; a reverser with shell-as-app-uid
or root can read the temp file in either window, or dump live process memory.

The proper defence — encrypted blob in TANUH's S3, key in `organisation_config`, plus a
custom JNI shim that calls `torch::jit::load(istream)` to keep plaintext entirely off-disk —
arrives in a later iteration. Use this build for trainings, demos, and pre-go-live
validation, not for unrestricted public distribution.

## One-time setup

Requires Node 20 (already pinned via `.nvmrc`), Java 17, Android SDK build-tools 35.0.0
and NDK 27.1.12297006 (matches the rest of the repo).

### Platform prerequisites

**Linux (Ubuntu / Debian):** `keytool` ships with the JDK, not as its own package. If
`make tanuh-setup` reports `keytool: command not found`:

```bash
sudo apt update
sudo apt install openjdk-17-jdk-headless
```

Verify with `keytool -help` and `java -version`. If Java is installed via SDKMAN or Android
Studio's bundled JBR but not on PATH, the binary is at `$JAVA_HOME/bin/keytool`.

**Android SDK location.** Gradle resolves the SDK via either `ANDROID_HOME` or
`packages/openchs-android/android/local.properties`. Common Linux setup:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Or per-checkout:
```bash
echo "sdk.dir=$HOME/Android/Sdk" > packages/openchs-android/android/local.properties
```

**Android NDK 27.1.12297006 must be installed exactly.** AGP auto-creates an empty NDK
folder named after some other version (e.g. `27.0.12077973`) when its auto-download flow
fails partway, then chokes on `did not have a source.properties file`. Fix:

```bash
# remove the broken empty folder if present
rm -rf ~/Android/Sdk/ndk/27.0.12077973   # (or whichever version Gradle complains about)

# install the right one — via Android Studio: Tools → SDK Manager → SDK Tools tab
# → tick "Show Package Details" → expand NDK (Side by side) → check 27.1.12297006

# or via cmdline-tools if you have them:
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "ndk;27.1.12297006"

# verify
ls ~/Android/Sdk/ndk/27.1.12297006/source.properties   # must print the file
```

**Network.** Gradle resolves the React Native build plugins from `plugins.gradle.org`. If
you're behind a corporate proxy, the `foojay-resolver-convention` plugin lookup fails. Set:
```properties
# ~/.gradle/gradle.properties
systemProp.https.proxyHost=<host>
systemProp.https.proxyPort=<port>
systemProp.http.proxyHost=<host>
systemProp.http.proxyPort=<port>
```

### Bootstrap

```bash
source ~/.nvm/nvm.sh && nvm use 20

# Install JS dependencies, apply patches, run prebuild. Required on a fresh checkout;
# repeat only when package.json or patches change.
make deps

# Generate a release keystore for signing the tanuh APK (keystore stays local; never committed).
make tanuh-setup
```

`make tanuh-setup` creates `tanuh-release-key.keystore` in the repo root and prompts for
the keystore + key passwords. Modern keytool defaults to PKCS12, which uses one password
for both keystore and key. Export before each release build:

```bash
export tanuh_KEYSTORE_PASSWORD='…'
export tanuh_KEY_ALIAS='tanuh'
# tanuh_KEY_PASSWORD only needed if you used JKS (-storetype JKS) with distinct passwords.
# build.gradle falls back to keystore password when KEY_PASSWORD is unset.
```

## Per-build flow

1. **Drop the plaintext model in the source dir.** Anything under
   `tools/edge-model/source/*.pt` is gitignored.

   ```bash
   cp /path/to/mvit2_fold5_2_latest_traced.pt tools/edge-model/source/
   ```

2. **Build the signed APK.**

   ```bash
   make tanuh-apk
   ```

   This target chains:
   - `tanuh-encrypt`: runs `node tools/edge-model/encrypt-model.js`, encrypts the source
     model with a fresh AES-GCM-256 key, writes the encrypted blob and `registry.json`
     into `packages/openchs-android/android/app/src/tanuh/assets/models/` (gitignored).
   - `assembleTanuhRelease`: Gradle release build for the `tanuh` flavour, signed with
     the keystore from `make tanuh-setup`.

   The signed APK lands at:

   ```
   packages/openchs-android/android/app/build/outputs/apk/tanuh/release/app-tanuh-release.apk
   ```

3. **Distribute.** Upload the APK to gdrive (or wherever the TANUH programme team
   distributes from). The plaintext model never leaves the build machine.

## 3-fold ensemble flow (current TANUH path)

The TANUH model is an **ensemble of 3 cross-validation folds** (`model6` / `model8` / `model8-2`,
registered as `mvit2_fold1_6` / `mvit2_fold1_8` / `mvit2_fold2_8`) of one MViT2 oral-cancer
classifier. Each fold is a **single-logit sigmoid-binary** head (verified from the model's
`classifier.bias` shape). The 3 folds run independently on-device and are **soft-voted in JS** by
`EdgeModelService.runEnsembleInferenceOnImage`. All 3 share `tanuh-ensemble-override.json`; this
**replaces** the old single `mvit2_fold5_2` path.

### Models you need

Three **ONNX** exports of the MViT2 folds (the on-device runtime is ONNX Runtime — see the note
below). `make tanuh-ensemble` keys off the source-file **basename** and maps it to a registry key:

| Source basename | Registry key    |
|-----------------|-----------------|
| `model6.onnx`   | `mvit2_fold1_6` |
| `model8.onnx`   | `mvit2_fold1_8` |
| `model8-2.onnx` | `mvit2_fold2_8` |

The files the AI team hands over are usually named with extra suffixes (the names and the directory
you receive them in vary per handover), but each carries a `(model6)` / `(model8)` / `(model8-2)` tag
telling you which fold it is. Stage the three under the exact basenames `model6` / `model8` /
`model8-2` in one directory first:

```bash
SRC=<dir holding the received .onnx files>     # varies per handover
STAGE=<your staging dir>                        # e.g. anywhere you like
mkdir -p "$STAGE"
cp "$SRC/<...(model6)...>.onnx"   "$STAGE/model6.onnx"
cp "$SRC/<...(model8)...>.onnx"   "$STAGE/model8.onnx"
cp "$SRC/<...(model8-2)...>.onnx" "$STAGE/model8-2.onnx"
```

> **ONNX, not PyTorch.** The runtime is ONNX Runtime Mobile, so the encrypted blobs must be built
> from `.onnx` (`engine=onnx` in `tanuh-ensemble-override.json`). If you switch onto the ONNX branch
> and the APK's models seem to "go missing", it's because the bundled `src/tanuh/assets/models/*.bin`
> were encrypted from the old PyTorch `.pt` (`engine=pytorch`) and ONNX Runtime can't load them —
> just re-run `tanuh-ensemble` from the `.onnx` sources to regenerate them.

### Build

```bash
source ~/.nvm/nvm.sh && nvm use 20          # repo-pinned Node 20; the metro bundle needs it
export tanuh_KEYSTORE_PASSWORD='…'          # the password you chose at `make tanuh-setup`
export tanuh_KEY_ALIAS='tanuh'

# Encrypt all 3 folds into one registry.json (clears any prior single-model registry first), then
# assemble the signed release APK. TANUH_ENSEMBLE_SRC_DIR has a machine-specific default in the
# makefile, so always set it explicitly to your staging dir from above.
TANUH_ENSEMBLE_SRC_DIR=<your staging dir> make tanuh-ensemble-apk    # → keys: mvit2_fold1_6/_1_8/_2_8

# Debug iteration instead of a signed APK:
TANUH_ENSEMBLE_SRC_DIR=<your staging dir> make tanuh-ensemble        # encrypt only → src/tanuh/assets/models/
make run_packager                                          # in another terminal
make run_app_tanuh_dev                                     # debug build, prod backend, dev menu
```

Signed APK: `packages/openchs-android/android/app/build/outputs/apk/tanuh/release/app-tanuh-release.apk`

Verify the bundled registry targets ONNX before distributing:

```bash
unzip -p .../app-tanuh-release.apk assets/models/registry.json \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print({k: v['override'].get('engine') for k,v in d['models'].items()})"
# expect every key → 'onnx'
```

### Inference methodology

**Soft-vote.** `runEnsembleInferenceOnImage(modelKeys, imagePath, opts)` runs each fold through the
single-model path and combines the outputs:

- `combine: 'mean-prob'` (default) — average the per-fold **sigmoid probabilities**, then threshold.
  This is the canonical fold soft-vote: a confident majority outweighs a lone dissenting fold, and a
  fold's confidence magnitude (not just its binary call) counts.
- `combine: 'mean-logit'` — average the raw **logits**, then apply sigmoid once.

`threshold` and `labels` default to the folds' **registry decoder override** (`output.params` of
`tanuh-ensemble-override.json` — `0.5` / `["Negative","Positive"]`), so the combined verdict tracks
the same config as the single-model path; values passed explicitly in `opts` win. The result is
`{label, confidence, positive, modelKeys, perModel}` — `perModel` carries each fold's logit/confidence
for debugging. A non-finite combined score (a fold result missing `confidence`/`logit`) **throws**
rather than silently scoring a confident `Negative`.

**Preprocessing** (`mean-target-bgr-rounded`, ported from the AI team's reference
`android_pre_processing.kt`): resize to 256² with **bicubic** (`cv2.INTER_CUBIC` parity,
`Preprocessors.kt::bicubicResize`), gray-world white-balance (scale each channel so its mean → 128,
clip, uint8 cast), then `/255` → `[0,1]`, **RGB** order, CHW layout. **No ImageNet mean/std**
normalisation — matching the reference and a HuggingFace MobileViTV2 image head (rescale by 1/255,
no normalise).

Reference a fold array from the rule — see "Using inference from a form rule".

## Quick-iteration debug build (no encryption, no signing)

For JS / native iteration with the real TANUH model:

```bash
make tanuh-encrypt TANUH_MODEL_KEY=mvit2_fold5_2_latest_traced  # populate src/tanuh/assets/models/
make run_packager                                               # in another terminal
make run_app_tanuh_dev                                          # debug build, prod backend, dev menu
```

Skip the `tanuh-encrypt` step if you don't need the model loaded — the app will still boot
but `EdgeModelService` will refuse inference for any unknown `modelKey`.

### Placeholder model for local development (no Python, no TANUH .pt)

If you don't have access to TANUH's `.pt` yet but want to exercise the full pipeline:

```bash
make tanuh-placeholder      # downloads a 20 MB public MobileNetV2 .pt, encrypts as 'placeholder'
make run_packager
make run_app_tanuh_dev
```

`make tanuh-placeholder` curls PyTorch's official `HelloWorldApp/model.pt` (ImageNet
224×224 RGB, 1000-class) and registers it under `placeholder` using
`tools/edge-model/placeholder-override.json` (`imagenet-rgb-chw` + `argmax-labels`).
Inference values are unrelated to TANUH's domain — use this to validate that the bridge,
preprocessor, decoder, encryption, and on-disk-decrypt-then-load flow all work end-to-end.

In a decision rule:

```js
const result = await params.services.edgeModelService.runInferenceOnImage(
    'placeholder', imagePath
);
// result: { label: <classIndex>, confidence, classIndex, raw: number[1000] }
```

Alternative — if you'd rather generate a tiny stub model that matches the real MViT2 shape
exactly (`[1, 3, 256, 256]` BGR/CHW → single logit), see
`tools/edge-model/make-placeholder-pt.py` (requires PyTorch installed locally).

## Using inference from a form rule

`params.services.edgeModelService` exposes these entry points. All take `imagePath` — the
**absolute** device path of the captured image (`file://` stripped), derived from the image
observation's stored filename — plus a `modelKey` (a key in `registry.json`). The `schedule*`
methods accept `modelKey` as **either a single key or an array of keys**; an array runs a
**soft-vote ensemble** (see below).

| Method | Use |
|---|---|
| `runInferenceOnImage(modelKey, imagePath)` → `Promise<{label, confidence, …}>` | Raw async inference for one model; call from a decision rule that already awaits. |
| `runEnsembleInferenceOnImage(modelKeys[], imagePath, {combine?, threshold?, labels?})` → `Promise<{label, confidence, positive, perModel}>` | Soft-vote across several single-logit sigmoid models (e.g. CV folds). `combine`: `'mean-prob'` (default, average the sigmoid probabilities) or `'mean-logit'` (average logits then sigmoid). |
| `scheduleImageInference(modelKey, imagePath, entity, targetConceptName, labelMap?)` | Fire-and-forget from a **synchronous form-element rule**. On resolve, writes the result to `targetConceptName` and re-renders. `modelKey` may be an array → ensemble. |
| `scheduleImageInferenceIntoGroup(modelKey, imagePath, entity, questionGroupConceptName, targetConceptName, rqgIdx, labelMap?)` | Same, but writes into row `rqgIdx` (zero-based) of a Repeatable Question Group. `modelKey` may be an array → ensemble. |

`labelMap` (optional) maps the raw model label to the stored value, e.g.
`{ "Positive": "Suspicious", "Negative": "Non Suspicious" }`.

```js
// form-element rule — RQG variant, 3-fold ensemble. Returns synchronously; the verdict lands later.
({params, imports}) => {
  const {entity, services, questionGroupIndex} = params;
  services.edgeModelService.scheduleImageInferenceIntoGroup(
    ['mvit2_fold1_6', 'mvit2_fold1_8', 'mvit2_fold2_8'], imagePath, entity,
    'Lesion Group', 'AI Suspicion Result', questionGroupIndex,
    { 'Positive': 'Suspicious', 'Negative': 'Non Suspicious' }
  );
  return new imports.rulesConfig.FormElementStatus(params.formElement.uuid, true);
};
```

Pass a single string instead of the array for one model. The schedule path ensembles with
defaults (`mean-prob`, threshold 0.5, labels `["Negative","Positive"]`); for a custom threshold or
labels, call `runEnsembleInferenceOnImage` directly from an awaited decision rule.

The `schedule*` methods dedup automatically (an array ensemble dedups as one unit — no re-run for
the same image+target; re-runs on a retake) and swallow errors (logged only — form save is never
blocked). Two traps:

- **Coded target:** the stored value (after `labelMap`) must equal an **answer concept name**
  of the target concept, or the write is silently skipped. Text targets store the string verbatim.
- **RQG:** the row at `rqgIdx` must already exist (capture the image into the row first) and
  `rqgIdx` must be numeric — rows are not auto-created.

### Showing a result (or image) read-only

Set the **form-element** keyValue `editable=false` (`[{"key": "editable", "value": false}]` in
`form_element.key_values`) to render a field display-only — the standard flag honoured across
datatypes. For Image/Video elements this shows the existing media and hides the camera, gallery,
remove and "add more" controls; with no value it shows "Not Known Yet". Pair it with the verdict
field above so the model's output can be viewed but not hand-edited.

## What lives where

```
tools/edge-model/
├─ encrypt-model.js              # AES-GCM-256 encryption CLI — format-agnostic
├─ sample-override.json          # ImageNet-style sample (imagenet-rgb-chw + argmax-labels)
├─ tanuh-mvit2-override.json     # single-model PoC pipeline — used by `make tanuh-apk`
├─ tanuh-ensemble-override.json  # 3-fold MViT2 ensemble (bicubic) — used by `make tanuh-ensemble`
├─ source/                       # plaintext .pt / .tflite files — gitignored
└─ README.md                     # this file

packages/openchs-android/android/app/src/tanuh/
├─ assets/models/                # encrypted blob + registry.json — gitignored, build-time only
├─ res/                          # branding (icons / splash) — replace generic placeholders with TANUH assets
└─ README.md

packages/openchs-android/android/app/src/main/java/com/openchsclient/
├─ EdgeModelModule.kt            # React Native bridge — engine-agnostic, model-agnostic
├─ ModelContract.kt              # parses the override JSON DSL
├─ engine/                       # InferenceEngine interface; OnnxEngine lives in src/tanuh/
├─ preprocessing/                # ImagePreprocessor interface + named registry
└─ decoding/                     # OutputDecoder interface + named registry
```

## When the model changes

Re-run `make tanuh-ensemble-apk` (or `make tanuh-apk` for a single model). The encryption CLI
generates a fresh AES key and IV per run, so old encrypted blobs become invalid. This is
intentional — there's no key-rotation ambiguity, the build is reproducible from the plaintext
source.

## The plugin model — adding a new model with novel preprocessing

The bridge is **engine-agnostic** and **model-agnostic**. Per-model semantics — which
inference engine to use, how to preprocess the image, how to decode the output — are
declared as a small JSON DSL in the registry's `override` block:

```json
{
  "engine": "onnx",
  "input":  { "preprocessor": "<name>", "params": { … } },
  "output": { "decoder":      "<name>", "params": { … } }
}
```

Plugin names resolve to Kotlin classes in:
- `preprocessing/Preprocessors.kt` — `imagenet-rgb-chw`, `mean-target-bgr-rounded` (both take an
  `interpolation` param: `"bilinear"` (default), `"nearest"`, or `"cubic"` for cv2.INTER_CUBIC parity)
- `decoding/Decoders.kt`         — `argmax-labels`, `sigmoid-binary`, `raw-floats`

To add a new model:

1. **Reuse an existing plugin if possible.** Most preprocessing variants can be expressed
   as different `params` for an existing plugin (different size, mean/std, channel order).
   Write a new override JSON pointing at the same plugin name with the new params.

2. **If genuinely novel:** drop a new class implementing `ImagePreprocessor` (or
   `OutputDecoder`) into the relevant registry, register it by name in the `REGISTRY` map,
   and reference the new name from your override JSON. **No edits to `EdgeModelModule.kt`.**

The DSL is **pure data** — no executable code. It travels in the AES-encrypted bundle and
parses through `org.json.JSONObject` only; there is no `eval`, no JS callback, no
dynamic class loading.

## Adding a new inference engine (e.g. ExecuTorch, ONNX Runtime, TFLite)

1. Add the engine's Gradle dependency to `app/build.gradle`.
2. Implement `InferenceEngine` in a new class under `engine/`.
3. Register it in `EdgeModelModule.engines` (the `engine` field in JSON now matches the new key).

`EdgeModelModule.kt` itself does not need to change — only the engine inventory map at
construction time.

## Installing a built APK on a device

`make tanuh-apk` produces split APKs per ABI:

```
build/outputs/apk/tanuh/release/app-tanuh-arm64-v8a-release.apk      # most modern phones
build/outputs/apk/tanuh/release/app-tanuh-armeabi-v7a-release.apk    # older 32-bit ARM
build/outputs/apk/tanuh/release/app-tanuh-x86-release.apk            # legacy emulators
build/outputs/apk/tanuh/release/app-tanuh-x86_64-release.apk         # x86_64 emulators (e.g. Genymotion)
```

Pick the ABI that matches the target device. For modern phones, that's `arm64-v8a`; for
Genymotion's default x86_64 image, that's `app-tanuh-x86_64-release.apk`.

If multiple devices are connected (e.g. a Genymotion emulator and a phone via USB),
`adb install` errors with `more than one device/emulator`. Disambiguate with `-s`:

```bash
adb devices                                                    # list connected devices/serials
adb -s <serial> install -r build/outputs/apk/tanuh/release/<flavor>.apk
```

If the device already has an older build signed with a different key, you'll see
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Uninstall the prior copy first:

```bash
adb -s <serial> uninstall org.tanuh.openchsclient
adb -s <serial> install build/outputs/apk/tanuh/release/<flavor>.apk
```

## Troubleshooting

### `keytool: command not found` on Linux
JDK isn't installed (or not on PATH). See platform prerequisites above —
`sudo apt install openjdk-17-jdk-headless` on Ubuntu/Debian.

### `[CXX1101] NDK at … did not have a source.properties file`
AGP auto-downloaded the NDK partially and left an empty folder. Delete that folder and
install the right NDK (27.1.12297006) explicitly. See platform prerequisites.

### `Plugin [id: 'org.gradle.toolchains.foojay-resolver-convention'] was not found`
Gradle can't reach `plugins.gradle.org`. Check `curl -sI https://plugins.gradle.org/`.
Configure proxy in `~/.gradle/gradle.properties` if behind a corporate firewall.

### `This file can not be opened as a file descriptor; it is probably compressed`
aapt2 compressed an asset that needs to be mmap-able. Add the extension to
`androidResources.noCompress` in `app/build.gradle`. Currently covered: `bin`, `pt`,
`ptl`, `tflite`, `onnx`. Adding a new model format → add the extension here.

### `Failed to load encrypted model: AEADBadTagException` or SHA-256 mismatch
The encrypted blob was rebuilt with a different key/IV than what's recorded in
`registry.json`, or the blob was tampered/corrupted in the APK. Run `make tanuh-clean`
followed by `make tanuh-encrypt` (or `make tanuh-apk`) to regenerate consistently.

### Release APK crashes on inference but debug build works
R8 stripped or renamed a JNI-resolved class. ONNX Runtime's `ai.onnxruntime.**` is kept by
`proguard-rules.pro`. If you add a new JNI-using library or a new `EdgeModelModule`/plugin
class that's reflected on, add a `-keep` rule.

### Inference returns nonsense / saturated outputs
Most likely a preprocessing divergence vs the AI team's PoC. Compare per-channel raw
pixel means, scale factors, and per-plane tensor stats — they're logged at `Log.d("Preproc", …)`
on every inference. `adb logcat -s Preproc EdgeModelModule` and run the same image
through the PoC app at `~/IdeaProjects/aiapp` to compare. Common culprits: BGR vs RGB
ordering, EXIF orientation not applied, mean-target value mismatch.

### `SigningConfig "tanuh" is missing required property "storePassword"`
`tanuh_KEYSTORE_PASSWORD` env var isn't exported. See the bootstrap section above.

### Multiple devices error: `more than one device/emulator`
See "Installing a built APK on a device" above for the `-s <serial>` flag.
