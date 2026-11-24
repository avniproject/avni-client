# Samiksha model container

A container that serves the Tanuh oral-screening ensemble (three ONNX folds) to Samiksha, the
blind model evaluation service. It runs the same code the phone runs, on ARM, and answers with a
verdict.

No model files, patient images or scores belong in this repository. The `dummy` image uses
made-up folds. The `real` image takes the real folds, already encrypted by the app's tooling,
from a folder outside the repository at build time.

## What runs from the app and what the container adds

The container compiles these files of the app unedited, from
`packages/openchs-android/android/app/src/main/java/com/openchsclient/`: `EdgeModelModule.kt`,
`ImageDecoding.kt`, `ModelContract.kt`, `preprocessing/ImagePreprocessor.kt`,
`preprocessing/Preprocessors.kt`, `preprocessing/PixelOps.kt`,
`engine/InferenceEngine.kt`, `engine/OnnxEngine.kt`, `decoding/OutputDecoder.kt` and
`decoding/Decoders.kt`. They run on Robolectric 4.18-beta-1, a library that supplies Android's own
classes on an ordinary Java 21 JVM, with Android 16 (API 36) and Android's native image decoder
(Skia), so an image is decoded, rotated by its EXIF orientation and resized as on a phone. The
folds are loaded with the app's `loadEncryptedModelFromFile` from a staging folder made by
`tools/edge-model/encrypt-model.js`. There is no emulator, Node process or screen.

The container adds:

- the HTTP service (`Server.kt`, `Predictor.kt`, `Main.kt`);
- the combining of the three folds (`Combine.kt`), copied from
  `EdgeModelService.runEnsembleInferenceOnImage` because the app does that step in JavaScript. Both
  run the cases in `combining-cases.json`: `CombineTest.kt` here and
  `packages/openchs-android/test/service/EdgeModelServiceCombiningCasesTest.js` in the app. Change
  the combining in one place and the other test fails until it follows;
- a few small classes that stand in for React Native and the Android build: `BuildConfig.kt`,
  `ShadowArguments.kt`, `RecordingPromise.kt` and `Folds.kt`.

Robolectric's image decoder is the native graphics library Robolectric builds from Android's
source, shipped as `org.robolectric:nativeruntime-dist-compat:1.0.20`. The jar does not name the
Android release it was built from, and the Android framework classes are Android 16 (API 36). A
phone's decoder is its own build of Skia, so a pixel can differ by a grey level or so from a
given phone. The tests check Robolectric's decoding against Pillow within 3 grey levels.

## The API

Port `8080`.

| Request | Answer |
|---|---|
| `GET /health` | 200 once the three folds are loaded |
| `GET /info` | `{"name": "tanuh-oral-mvit2", "version": "<MODEL_VERSION>", "folds": 3}` |
| `POST /predict` | `{"request_id", "image": "<base64 of the JPEG or PNG file>"}` gives `{"request_id", "label", "score", "folds"}` |

`label` is `Suspicious` or `Non-Suspicious`. `score` is the lowest of the three fold
probabilities, and `label` is `Suspicious` exactly when `score >= 0.5` (the override's
`threshold_inclusive`). Two answers are 422 with
`{"request_id", "error"}`: `unreadable_image` when Android's decoder cannot read the file, and
`inference_failed` when a fold fails or a fold's logit is not a finite number. A body that is not
JSON, or lacks `request_id` or `image`, or whose `image` is not base64, is a 400.

Settings come from the environment: `PORT` (8080), `FOLDS_DIR` (`/folds`), `OVERRIDE_JSON`
(`/app/override.json`) and `MODEL_VERSION` (set from the build argument `VERSION`).

## Run the tests

They need Java 21, Python 3.12 with `requirements.txt`, and Node (to run `encrypt-model.js`).
`./gradlew test` makes the dummy folds, encrypts them and runs every test:

    uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python -r requirements.txt pytest
    ./gradlew test
    .venv/bin/python -m pytest tests -v

On Apple silicon the Gradle tests run natively on arm64. The same tests have also been run inside
`eclipse-temurin:21-jdk` for `linux/arm64`.

## Build

You need Docker with BuildKit (`buildx`), because the `real` build uses `--build-context`. Docker
Desktop has it. With Colima, install `docker-buildx` too and link it into `~/.docker/cli-plugins`.
Give Docker 6 to 8 GB of memory, as the Gradle stage is heavy.

Build from the repository root, because the build reads the app's source files. Mind the `.` at
the end of each command: it is the build context, and `docker build` refuses to run without it.
Dummy folds, for testing:

    docker build --platform linux/arm64 -f tools/samiksha-model/Dockerfile --target dummy \
      --build-arg VERSION=0.2.0-dummy -t tanuh-oral-model:dummy .

Real folds, from a folder that holds only the three blobs, `manifest.json` and `keys.json`, as
`make tanuh-ensemble` writes them (see `makefiles/tanuh.mk`):

    docker build --platform linux/arm64 -f tools/samiksha-model/Dockerfile --target real \
      --build-arg VERSION=1.0.0 --build-context folds=/path/to/staging -t tanuh-oral-model:1.0.0 .

The build copies only `manifest.json`, `keys.json` and the `.bin` blobs from that folder, so
nothing else in it (a private key, key tables) reaches the image, and the build fails if `manifest.json` or `keys.json` is missing.

The image is for `linux/arm64` only.

### Real folds handed over with RSA-wrapped keys

The folds may come as a handoff folder instead: the blobs, a `manifest.json` with a `models`
list, `wrapped_keys/<sha256>.key.enc.b64` and `keys/private_key.pem`. The server cannot read
that folder; it stops at start-up because `manifest.json` has no `items` and there is no
`keys.json`. The blobs already have the app's layout, so only the manifest and the keys need
redoing. `unwrap_folds.py` unwraps each key with the private key, checks it by decrypting its
fold, and writes a folder the `real` build can use:

    pip install cryptography
    python3 tools/samiksha-model/unwrap_folds.py tools/edge-model/staging tools/edge-model/samiksha-folds

Then build with `--build-context folds=tools/edge-model/samiksha-folds`. The private key and the
handoff tables stay in the handoff folder and out of the image. Keep both folders out of git.

## Check the image

Check that it serves without a network, as Samiksha runs it. The container has no `curl`, so the
call goes through bash. Loading the folds takes a few seconds, and a call made before then is
refused (`Connection refused`), so wait for it:

    docker run -d --name oral --platform linux/arm64 --network none --cpus 1 --memory 1g tanuh-oral-model:1.0.0
    for i in $(seq 1 30); do
      docker exec oral bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080; printf "GET /health HTTP/1.0\r\n\r\n" >&3; head -1 <&3' 2>/dev/null && break
      sleep 1
    done
    docker logs oral 2>&1 | tail -5
    docker rm -f oral

It answers `HTTP/1.1 200 OK` within about 10 seconds (about 4 on an M-series Mac), and the log
ends with `samiksha-model: 3 folds loaded in <n> ms; serving on port 8080`. The log also starts
with `JUnit version 4.13.2`, because the server runs under Robolectric's JUnit runner, and has
ONNX Runtime warnings about removing unused initializers from the traced folds. Neither is a
problem. If the container exits instead, the log says why; a staging folder in the wrong format
fails while loading the folds.

## Upload to Samiksha

The archive holds `keys.json`, so it can decrypt the folds. Upload it only to Samiksha, keep it
out of the repository, and delete it once it is uploaded.

1. Save the image as an archive (about 700 MB for the real folds):

       docker save tanuh-oral-model:1.0.0 | gzip > tanuh-oral-model-1.0.0.tar.gz

2. On the Samiksha site, open the model upload form and download the command-line upload script,
   `samiksha.py`. It needs Python 3.10 or later and nothing else. On macOS the command is
   `python3`, not `python`.
3. Sign in once. Your browser opens the site's sign-in page, and the script prints
   `Signed in as <email> (<role>).` when it worked:

       python3 samiksha.py login

4. Check that `oral-screening` is listed under the evaluations a model can be uploaded against:

       python3 samiksha.py list

5. Upload with `upload-model`. `--model` is the model's name on Samiksha; use the same name each
   time, so each upload is a new version of the one model. `--note` is one line, up to 200
   characters, on what changed in this version. If you sign in as an operator rather than as the
   provider, give `--provider tanuh`, as an operator has no provider of its own. `--start` starts
   runs on the datasets on the evaluation's list once the checks pass; without it no run starts by
   itself:

       python3 samiksha.py upload-model tanuh-oral-model-1.0.0.tar.gz --model tanuh-oral-model \
         --provider tanuh --evaluation oral-screening \
         --note "First version with the real folds" --start

   The checks are printed as they finish, and the last line is
   `Version <n> of tanuh/<model> is ready`. If the connection drops, run the same command again
   to carry on.

The image labels `samiksha.model.cpu`, `samiksha.model.memory` and `samiksha.model.concurrency`
tell Samiksha what to give the container.
