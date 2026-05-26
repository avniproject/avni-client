# Edge Model Assets (main flavour)

The main flavour ships **no model bytes**. `registry.json` here is an empty placeholder
read by `EdgeModelService` at app boot.

Flavours that need on-device inference (currently `tanuh`) override `registry.json` and
add an encrypted model under their own `assets/models/` at build time. See
`tools/edge-model/README.md` for the cold-start flow.

For dev-time experimentation with the inference pipeline, the public placeholder model
lives at `tools/edge-model/source/sample-model.tflite`. Use the encryption CLI to
produce a tanuh-flavour build that exercises it.
