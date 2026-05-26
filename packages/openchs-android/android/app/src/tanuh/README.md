# TANUH flavour

Branding + edge-model assets for the TANUH HealthForge build of the Avni client.

## Branding

`res/` is copied from `src/generic/res/` as a placeholder. Replace icons, splash, and
colour resources with TANUH branding when the partner ships them. See `flavor_config.json`
for the server URL and Bugsnag config.

## Edge-model assets

`assets/models/` is *empty by default* and intentionally so. The encrypted model blob
and the per-build `registry.json` (which carries the AES key) are produced at build time
by the encryption CLI on the TANUH developer's machine — both are listed in `.gitignore`.

The cold-start build flow is documented in `tools/edge-model/README.md`. In short:

```
# one-time
make tanuh-setup           # generate keystore

# every build
nvm use
make deps
export tanuh_KEYSTORE_PASSWORD='<the keystore password you chose>'"
export tanuh_KEY_ALIAS='tanuh'"
cp /path/to/oral-cancer.tflite tools/edge-model/source/
TANUH_MODEL_KEY=sample-model make tanuh-apk           # → encrypts model, writes assets, signs APK
```

When the build finishes, `app-tanuh-release.apk` is the artefact to distribute.
