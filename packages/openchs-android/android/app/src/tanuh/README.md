# TANUH flavour

Branding + edge-model assets for the TANUH HealthForge build of the Avni client.

## Branding

`res/` is copied from `src/generic/res/` as a placeholder. Replace icons, splash, and
colour resources with TANUH branding when the partner ships them. See `flavor_config.json`
for the server URL and Bugsnag config.

## Edge-model assets

`assets/models/` is empty and stays that way — the build ships **no model bytes**.
`make tanuh-verify-no-model` fails the build if a blob is left there, and it is a hard
prerequisite of both the APK and AAB targets.

The 3 fold models are encrypted into a staging dir as *provisioning artefacts* (blobs,
reference-data manifest, and `keys.json`) and delivered to devices as synced
`DownloadableContent` — never bundled. The flow is documented in
`tools/edge-model/README.md`. In short:

```
# one-time
make tanuh-setup           # generate keystore

# every build (3-fold ensemble — the current TANUH path)
nvm use
make deps
export tanuh_KEYSTORE_PASSWORD='<the keystore password you chose>'
export tanuh_KEY_ALIAS='tanuh'
make tanuh-ensemble-apk    # → encrypts the 3 fold models to staging, signs a model-free APK
```

When the build finishes, `app-tanuh-release.apk` is the artefact to distribute; the staged
provisioning artefacts are uploaded separately so devices pick the models up at sync.
