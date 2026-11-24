# The Samiksha model container: the app's own Kotlin for images, preprocessing, ONNX and decoding,
# run on Robolectric for ARM, behind the Samiksha model API. Build from the repository root, as the
# build reads the app's source files:
#
#   docker build --platform linux/arm64 -f tools/samiksha-model/Dockerfile --target dummy \
#     --build-arg VERSION=0.2.0-dummy -t tanuh-oral-model:dummy .
#
# Targets: `dummy` (made-up folds, for tests) and `real` (the encrypted folds from a build context
# named `folds`, a staging folder made by tools/edge-model/encrypt-model.js). See README.md.

# Made-up folds, encrypted as the app's encrypt-model.js does.
FROM python:3.12-slim AS folds-dummy
RUN apt-get update && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*
WORKDIR /repo/tools
COPY tools/samiksha-model/requirements.txt samiksha-model/
RUN pip install --no-cache-dir -r samiksha-model/requirements.txt
COPY tools/edge-model/encrypt-model.js tools/edge-model/tanuh-ensemble-override.json edge-model/
COPY tools/samiksha-model/make_dummy_folds.py tools/samiksha-model/stage-dummy-folds.sh samiksha-model/
COPY tools/samiksha-model/tests samiksha-model/tests
RUN bash samiksha-model/stage-dummy-folds.sh /staging && rm -rf /staging/images

# The server and Robolectric's Android 16 framework jar, which the container reads offline.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /repo
COPY packages/openchs-android/android/app/src/main/java/com/openchsclient packages/openchs-android/android/app/src/main/java/com/openchsclient
COPY tools/edge-model/tanuh-ensemble-override.json tools/edge-model/
COPY tools/samiksha-model tools/samiksha-model
WORKDIR /repo/tools/samiksha-model
RUN ./gradlew --no-daemon installDist copyRobolectricDeps

FROM eclipse-temurin:21-jre AS base
ARG VERSION
ENV PORT=8080 FOLDS_DIR=/folds OVERRIDE_JSON=/app/override.json MODEL_VERSION=${VERSION} \
    JAVA_OPTS="-XX:MaxRAMPercentage=60 -Drobolectric.offline=true -Drobolectric.dependency.dir=/robolectric"
COPY --from=build /repo/tools/samiksha-model/build/install/samiksha-model /app
COPY --from=build /repo/tools/samiksha-model/build/robolectric /robolectric
COPY --from=build /repo/tools/edge-model/tanuh-ensemble-override.json /app/override.json
RUN useradd --system --uid 10001 --create-home model
# Measured with the dummy folds: under 600 MiB and about one processor, one image at a time. With the real
# folds at --cpus 1 --memory 1g: 587 MiB after three predictions on one benchmark photo, about 0.5 s each.
LABEL org.opencontainers.image.version=${VERSION} \
      samiksha.model.cpu=1024 \
      samiksha.model.memory=1024 \
      samiksha.model.concurrency=1
EXPOSE 8080
USER model
CMD ["/app/bin/samiksha-model", "org.samiksha.tanuh.Main"]

FROM base AS dummy
COPY --from=folds-dummy /staging/ /folds/

FROM base AS real
# Only what the server reads: anything else in the folder (a private key, key tables) stays out of the image,
# and a folder without keys.json fails here rather than at start-up.
COPY --from=folds manifest.json keys.json *.bin /folds/
