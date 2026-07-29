# Edge Model Assets

**Nothing ships model bytes in the APK, on any flavour.**

Edge models are provisioned as synced `DownloadableContent`: encrypted blobs land in external
storage and their AES keys in app-private storage, both at sync time. `EdgeModelService` resolves
a model from the synced rows by sha256 — it never reads anything from `assets/`, and never
downloads at point of use. Recovery from a missing model is to sync, not to rebuild.

The older `registry.json` + APK-asset delivery path was removed in avni-client#1947 (the native
`getRegistry` / `loadModel` / `loadEncryptedModel` bridge methods went with it), and
avni-client#1950 made model-free builds enforced: `make tanuh-verify-no-model` fails the build if
a model blob is found in flavour assets.

See `tools/edge-model/README.md` for the provisioning flow.
