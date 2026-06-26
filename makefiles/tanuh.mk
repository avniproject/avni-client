# tanuh.mk — build automation for the tanuh edge-model flavour.
#
# The model is NOT in the APK. The build produces a model-free binary plus a staging dir of
# provisioning artefacts; ops upload the blobs to the org's GCS models/ prefix, create the
# downloadable-content reference-data items, and load the AES keys into the server key store.
#
#   make tanuh-setup        # one-time: generate signing keystore
#   make tanuh-encrypt      # encrypt a model -> tools/edge-model/staging/ (provisioning artefacts)
#   make tanuh-aab          # signed model-free release AAB (+ provisioning artefacts)
#   make tanuh-size-gate    # go-live gate: per-ABI download size < 200 MB
#
# The on-device runtime is ONNX Runtime Mobile (com.microsoft.onnxruntime:onnxruntime-android)
# and the models are ONNX exports of the clinically-validated MViT2 folds. ONNX Runtime is used
# because its 64-bit native libs are 16 KB-page-aligned (Play targetSdk 35 compliant), unlike
# PyTorch Mobile 1.13.1 (avni-product-ops#186). The ensemble path is `make tanuh-ensemble`.
#
# Plaintext model:  tools/edge-model/source/<name>.onnx                 (gitignored)
# Provisioning out: tools/edge-model/staging/{<sha256>.bin, manifest.json, keys.json}  (gitignored)
# Signed AAB:       packages/openchs-android/android/app/build/outputs/bundle/tanuhRelease/app-tanuh-release.aab
#
# See tools/edge-model/README.md for the full documentation.

# Override on the command line: TANUH_MODEL_KEY=mvit2_fold5_2_latest_traced make tanuh-encrypt
# Model file extension for the plaintext sources (onnx by default; the runtime is ONNX Runtime).
TANUH_MODEL_EXT ?= onnx
TANUH_MODEL_KEY ?= mvit2_fold5_2_latest_traced
TANUH_MODEL_SRC := tools/edge-model/source/$(TANUH_MODEL_KEY).$(TANUH_MODEL_EXT)
TANUH_STAGING_DIR := tools/edge-model/staging
# Flavour asset dir. Nothing model-related is bundled here any more; the guard below fails the
# build if a stale .bin is left behind (silent re-bloat).
TANUH_ASSETS_MODELS := packages/openchs-android/android/app/src/tanuh/assets/models
# Default override captures the PoC pipeline. Swap on the command line for a different model:
#   TANUH_OVERRIDE=tools/edge-model/my-other-model-override.json make tanuh-encrypt
TANUH_OVERRIDE  := tools/edge-model/tanuh-mvit2-override.json
TANUH_KEYSTORE  := tanuh-release-key.keystore

tanuh-setup: ## One-time: generate the tanuh release keystore.
	@if [ -f "$(TANUH_KEYSTORE)" ]; then \
		echo "Keystore already exists at $(TANUH_KEYSTORE) — skipping. Delete it first to regenerate."; \
		exit 0; \
	fi
	@echo "Generating tanuh release keystore. You will be prompted for passwords and DN."
	@keytool -genkeypair -v \
		-keystore $(TANUH_KEYSTORE) \
		-alias tanuh \
		-keyalg RSA -keysize 2048 \
		-validity 10000
	@echo ""
	@echo "Keystore created. Set these env vars in your shell before running the release targets:"
	@echo "  export tanuh_KEYSTORE_PASSWORD='<the keystore password you just chose>'"
	@echo "  export tanuh_KEY_ALIAS='tanuh'"

tanuh-encrypt: ## Encrypt the plaintext model into the provisioning staging dir.
	@if [ ! -f "$(TANUH_MODEL_SRC)" ]; then \
		echo "ERROR: $(TANUH_MODEL_SRC) not found."; \
		echo "Drop your plaintext .$(TANUH_MODEL_EXT) there (filename = TANUH_MODEL_KEY + .$(TANUH_MODEL_EXT))."; \
		echo "  cp /path/to/$(TANUH_MODEL_KEY).$(TANUH_MODEL_EXT) tools/edge-model/source/"; \
		exit 1; \
	fi
	@mkdir -p $(TANUH_STAGING_DIR)
	node tools/edge-model/encrypt-model.js \
		--in $(TANUH_MODEL_SRC) \
		--staging-dir $(TANUH_STAGING_DIR) \
		--name $(TANUH_MODEL_KEY) \
		--override $(TANUH_OVERRIDE)

tanuh-verify-no-model: ## Fail the build if a model blob is left in the flavour assets (it must not ship in the APK).
	@if ls $(TANUH_ASSETS_MODELS)/*.bin >/dev/null 2>&1; then \
		echo "ERROR: model blob(s) found in $(TANUH_ASSETS_MODELS) — these would ship in the APK."; \
		echo "The model is delivered via sync, not bundled. Remove them: rm -f $(TANUH_ASSETS_MODELS)/*.bin"; \
		exit 1; \
	fi

tanuh-apk: ## Build the signed model-free tanuh release APK (+ provisioning artefacts).
	$(MAKE) tanuh-encrypt
	$(MAKE) _tanuh-release-assemble

_tanuh-release-assemble: tanuh-verify-no-model ## (internal) Assemble + sign the model-free tanuh release APK.
	@if [ ! -f "$(TANUH_KEYSTORE)" ]; then \
		echo "ERROR: $(TANUH_KEYSTORE) not found. Run 'make tanuh-setup' first."; \
		exit 1; \
	fi
	@if [ -z "$$tanuh_KEYSTORE_PASSWORD" ] || [ -z "$$tanuh_KEY_ALIAS" ]; then \
		echo "ERROR: signing env vars not set. Export tanuh_KEYSTORE_PASSWORD and tanuh_KEY_ALIAS."; \
		echo "(tanuh_KEY_PASSWORD is optional — modern keytool defaults to PKCS12 where it equals the keystore password.)"; \
		exit 1; \
	fi
	# Generate src/framework/Config.js with SERVER_URL from flavor_config.json (tanuh entry).
	# Without this, the app launches with no SERVER_URL configured and shows
	# "Server under maintenance" because /idp-details cannot be reached.
	$(MAKE) as_prod flavor=tanuh
	# Pick the metro bundler config (falls back to metro.config.generic.js for unknown flavours).
	$(MAKE) metro_config flavor=tanuh
	# KEY_STORE_PREFIX prepends to the keystore filename in build.gradle's file(...) lookup;
	# point it at repo root so the keystore generated by `make tanuh-setup` is found.
	cd packages/openchs-android/android; KEY_STORE_PREFIX="$(CURDIR)/" GRADLE_OPTS="$(if $(GRADLE_OPTS),$(GRADLE_OPTS),-Xmx1024m -Xms1024m)" ./gradlew assembleTanuhRelease --stacktrace
	@echo ""
	@echo "Signed APK: packages/openchs-android/android/app/build/outputs/apk/tanuh/release/app-tanuh-release.apk"

# ── 3-fold MViT2 ensemble ───────────────────────────────────────────────────────────
# model6/model8/model8-2 are cross-validation folds of one MViT2 oral-cancer model, shipped
# as ONNX exports and soft-voted in JS by EdgeModelService.runEnsembleInferenceOnImage. Drop
# the 3 plaintext .onnx files (named model6.onnx model8.onnx model8-2.onnx) in
# $(TANUH_ENSEMBLE_SRC_DIR); `tanuh-ensemble` clears staging then encrypts all three
# (bicubic ensemble override, engine=onnx) under names mvit2_fold1_6/fold1_8/fold2_8.
TANUH_ENSEMBLE_SRC_DIR  ?= $(HOME)/Desktop/avni/assets/ml
TANUH_ENSEMBLE_OVERRIDE := tools/edge-model/tanuh-ensemble-override.json
# Mapping of source-file basename → reference-data item name.
TANUH_ENSEMBLE_FOLDS    := model6:mvit2_fold1_6 model8:mvit2_fold1_8 model8-2:mvit2_fold2_8

tanuh-ensemble: ## Encrypt the 3 MViT2 folds into the staging dir (bicubic ensemble override).
	@for pair in $(TANUH_ENSEMBLE_FOLDS); do \
		src="$(TANUH_ENSEMBLE_SRC_DIR)/$${pair%%:*}.$(TANUH_MODEL_EXT)"; \
		if [ ! -f "$$src" ]; then \
			echo "ERROR: $$src not found."; \
			echo "Set TANUH_ENSEMBLE_SRC_DIR to the dir holding model6.$(TANUH_MODEL_EXT) model8.$(TANUH_MODEL_EXT) model8-2.$(TANUH_MODEL_EXT)"; \
			exit 1; \
		fi; \
	done
	$(MAKE) tanuh-clean
	@mkdir -p $(TANUH_STAGING_DIR) tools/edge-model/source
	@for pair in $(TANUH_ENSEMBLE_FOLDS); do \
		file="$${pair%%:*}"; name="$${pair##*:}"; \
		cp "$(TANUH_ENSEMBLE_SRC_DIR)/$$file.$(TANUH_MODEL_EXT)" "tools/edge-model/source/$$name.$(TANUH_MODEL_EXT)"; \
		node tools/edge-model/encrypt-model.js \
			--in "tools/edge-model/source/$$name.$(TANUH_MODEL_EXT)" \
			--staging-dir $(TANUH_STAGING_DIR) \
			--name "$$name" \
			--override $(TANUH_ENSEMBLE_OVERRIDE); \
	done
	@echo ""
	@echo "Staged 3 folds into $(TANUH_STAGING_DIR)/ (manifest.json + keys.json): mvit2_fold1_6, mvit2_fold1_8, mvit2_fold2_8"
	@echo "Provision: upload $(TANUH_STAGING_DIR)/*.bin to the org GCS models/ prefix, create the reference-data"
	@echo "items from manifest.json, and load keys.json into the server key store."
	@echo "From a form-element rule (soft-vote ensemble → one verdict):"
	@echo "  services.edgeModelService.scheduleImageInference("
	@echo "    ['mvit2_fold1_6','mvit2_fold1_8','mvit2_fold2_8'], imagePath, entity,"
	@echo "    'AI Suspicion Result', {Positive:'Suspicious', Negative:'Non Suspicious'})"

tanuh-ensemble-apk: ## Encrypt the 3 folds + assemble the signed model-free tanuh release APK.
	$(MAKE) tanuh-ensemble
	$(MAKE) _tanuh-release-assemble

tanuh-clean: ## Remove the staging artefacts (blobs, manifest.json, keys.json).
	rm -rf $(TANUH_STAGING_DIR)
	@echo "Cleared $(TANUH_STAGING_DIR)/"

# ── Play Store / universal-APK pipeline (ENSEMBLE) ──────────────────────────────────
# Mirrors what CircleCI's release_android_live job (.circleci/config.yml) produces for
# other flavours: a signed AAB for the Play Store and a signed universal APK derived from
# that AAB via bundletool. The AAB ships NO model — `tanuh-ensemble` only writes the
# provisioning artefacts to staging, and `tanuh-verify-no-model` fails the build if a blob
# was left in the flavour assets.
#
# Both targets honour `versionCode` / `versionName` env vars. build.gradle:63-67 reads
# them from the environment; without them, versionCode defaults to 1 (real value
# 8388609 after the 8*1048576 base offset) and versionName defaults to "1".

BUNDLETOOL_VERSION ?= 1.15.1
BUNDLETOOL_JAR     := bundletool.jar
BUNDLETOOL_URL     := https://github.com/google/bundletool/releases/download/$(BUNDLETOOL_VERSION)/bundletool-all-$(BUNDLETOOL_VERSION).jar
# Recursive (=) so the $$ survive make expansion and the signing vars resolve in the recipe shell.
# Shared by every build-apks invocation so the size gate signs identically to what ships.
BUNDLETOOL_SIGN_FLAGS = --ks=$(TANUH_KEYSTORE) --ks-pass=pass:$$tanuh_KEYSTORE_PASSWORD --ks-key-alias=$$tanuh_KEY_ALIAS --key-pass=pass:$${tanuh_KEY_PASSWORD:-$$tanuh_KEYSTORE_PASSWORD}
TANUH_AAB          := packages/openchs-android/android/app/build/outputs/bundle/tanuhRelease/app-tanuh-release.aab
TANUH_UNIVERSAL    := tanuh-universal.apks
# Go-live size gate: largest per-device download must stay under Google Play's 200 MB ceiling.
TANUH_SIZE_GATE_APKS   := tanuh-size-gate.apks
TANUH_SIZE_REPORT      := tanuh-size-report.csv
TANUH_SIZE_LIMIT_BYTES ?= 209715200

tanuh-aab: tanuh-ensemble tanuh-verify-no-model ## Build signed model-free tanuh release AAB (+ provisioning artefacts). Pass versionCode=N versionName=X to set them.
	@if [ ! -f "$(TANUH_KEYSTORE)" ]; then \
		echo "ERROR: $(TANUH_KEYSTORE) not found. Run 'make tanuh-setup' first."; \
		exit 1; \
	fi
	@if [ -z "$$tanuh_KEYSTORE_PASSWORD" ] || [ -z "$$tanuh_KEY_ALIAS" ]; then \
		echo "ERROR: signing env vars not set. Export tanuh_KEYSTORE_PASSWORD and tanuh_KEY_ALIAS."; \
		exit 1; \
	fi
	$(MAKE) as_prod flavor=tanuh
	$(MAKE) metro_config flavor=tanuh
	cd packages/openchs-android/android; KEY_STORE_PREFIX="$(CURDIR)/" GRADLE_OPTS="$(if $(GRADLE_OPTS),$(GRADLE_OPTS),-Xmx1024m -Xms1024m)" ./gradlew bundleTanuhRelease --stacktrace
	@echo ""
	@echo "Signed AAB (model-free): $(TANUH_AAB)"
	@echo "  versionCode env=$${versionCode:-<unset, defaults to 1>}  versionName env=$${versionName:-<unset, defaults to 1>}"

tanuh-universal-apk: tanuh-aab ## Build signed model-free AAB + signed universal APK via bundletool.
	@if [ ! -f "$(BUNDLETOOL_JAR)" ]; then \
		echo "Downloading bundletool $(BUNDLETOOL_VERSION)..."; \
		curl -fSL -o $(BUNDLETOOL_JAR) $(BUNDLETOOL_URL); \
	fi
	rm -f $(TANUH_UNIVERSAL)
	java -jar $(BUNDLETOOL_JAR) build-apks \
		--bundle=$(TANUH_AAB) \
		--output=$(TANUH_UNIVERSAL) \
		--mode=universal \
		$(BUNDLETOOL_SIGN_FLAGS)
	@echo ""
	@echo "Signed AAB (model-free): $(TANUH_AAB)"
	@echo "Universal apks (zip):  $(TANUH_UNIVERSAL)"
	@echo "Extract installable APK: unzip -p $(TANUH_UNIVERSAL) universal.apk > tanuh-universal.apk"

tanuh-size-gate: tanuh-aab ## Go-live gate: per-ABI download size on the release AAB must be < 200 MB.
	@if [ ! -f "$(BUNDLETOOL_JAR)" ]; then \
		echo "Downloading bundletool $(BUNDLETOOL_VERSION)..."; \
		curl -fSL -o $(BUNDLETOOL_JAR) $(BUNDLETOOL_URL); \
	fi
	rm -f $(TANUH_SIZE_GATE_APKS)
	java -jar $(BUNDLETOOL_JAR) build-apks \
		--bundle=$(TANUH_AAB) \
		--output=$(TANUH_SIZE_GATE_APKS) \
		$(BUNDLETOOL_SIGN_FLAGS)
	# Redirect (not pipe) so a bundletool failure aborts the target instead of being masked by tee.
	java -jar $(BUNDLETOOL_JAR) get-size total --apks=$(TANUH_SIZE_GATE_APKS) --dimensions=ABI > $(TANUH_SIZE_REPORT)
	@echo "Per-device download size (bytes), by ABI:"
	@cat $(TANUH_SIZE_REPORT)
	@rows=$$(tail -n +2 $(TANUH_SIZE_REPORT) | grep -c .); \
	if [ "$$rows" -eq 0 ]; then echo "FAIL: bundletool get-size produced no data rows"; exit 1; fi; \
	max=$$(tail -n +2 $(TANUH_SIZE_REPORT) | awk -F, 'BEGIN{m=0} {if($$NF+0>m)m=$$NF+0} END{print m+0}'); \
	echo "max per-device download = $$max bytes (limit $(TANUH_SIZE_LIMIT_BYTES))"; \
	if [ "$$max" -le 0 ]; then echo "FAIL: could not parse a positive size from bundletool output"; exit 1; fi; \
	if [ "$$max" -gt "$(TANUH_SIZE_LIMIT_BYTES)" ]; then \
		echo "FAIL: exceeds the 200 MB Google Play limit"; exit 1; \
	else \
		echo "PASS: under the 200 MB Google Play limit"; \
	fi

# Explicit ensemble-named aliases (tanuh-aab / tanuh-universal-apk now ARE the ensemble path;
# these read clearer at call sites and in CI).
tanuh-ensemble-aab: tanuh-aab ## Alias: signed model-free ensemble AAB.
tanuh-ensemble-universal-apk: tanuh-universal-apk ## Alias: signed model-free ensemble AAB + universal APK.

# Placeholder model setup for local development without tanuh's actual models.
# Downloads the ONNX model zoo's public MobileNetV2 (~14 MB, ImageNet 224x224 RGB,
# 1000-class output) and encrypts it under name=placeholder using
# tools/edge-model/placeholder-override.json. Inference values are unrelated to tanuh's
# domain — use it to verify the encrypt/provision plumbing only.
PLACEHOLDER_ONNX_URL := https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-7.onnx
PLACEHOLDER_ONNX_DST := tools/edge-model/source/placeholder.onnx

tanuh-placeholder: ## Download a public placeholder .onnx and encrypt as 'placeholder' into staging.
	@if [ ! -f "$(PLACEHOLDER_ONNX_DST)" ]; then \
		echo "Downloading placeholder ONNX MobileNetV2 from the onnx/models zoo..."; \
		mkdir -p $$(dirname $(PLACEHOLDER_ONNX_DST)); \
		curl -fSL -o $(PLACEHOLDER_ONNX_DST) $(PLACEHOLDER_ONNX_URL); \
	else \
		echo "$(PLACEHOLDER_ONNX_DST) already present — skipping download."; \
	fi
	@mkdir -p $(TANUH_STAGING_DIR)
	node tools/edge-model/encrypt-model.js \
		--in $(PLACEHOLDER_ONNX_DST) \
		--staging-dir $(TANUH_STAGING_DIR) \
		--name placeholder \
		--override tools/edge-model/placeholder-override.json
	@echo ""
	@echo "Staged 'placeholder' under $(TANUH_STAGING_DIR). The model is delivered via sync, so"
	@echo "provision it on the server your app points at: upload the blob to GCS models/, create the"
	@echo "reference-data item from manifest.json, and load keys.json into the server key store. Then:"
	@echo "  make run_packager        (in another terminal)"
	@echo "  make run_app_tanuh_dev"
	@echo "After a sync pulls the reference data, in a decision rule:"
	@echo "  await params.services.edgeModelService.runInferenceOnImage('placeholder', imagePath)"

# Debug-flavour iteration helpers — install + launch tanuh debug build via gradlew + adb.
# No signing, no Metro release bundle. Requires `make run_packager` running in another
# terminal so the app can fetch the dev JS bundle. The model is delivered via sync (provision
# it on the server the app points at); nothing is bundled in the debug build either.

run_app_tanuh: ## Install + launch tanuh debug build, prod backend.
	$(MAKE) as_prod flavor=tanuh
	$(MAKE) _run_app flavor=tanuh

run_app_tanuh_dev: ## Install + launch tanuh debug build, prod backend with dev menu.
	$(MAKE) as_prod_dev flavor=tanuh
	$(MAKE) _run_app flavor=tanuh

# Hyphenated aliases matching the project's `run-app-*` convention.
run-app-tanuh: run_app_tanuh
run-app-tanuh-dev: run_app_tanuh_dev

.PHONY: tanuh-setup tanuh-encrypt tanuh-verify-no-model tanuh-apk _tanuh-release-assemble tanuh-ensemble tanuh-ensemble-apk tanuh-aab tanuh-universal-apk tanuh-size-gate tanuh-ensemble-aab tanuh-ensemble-universal-apk tanuh-clean tanuh-placeholder run_app_tanuh run_app_tanuh_dev run-app-tanuh run-app-tanuh-dev
