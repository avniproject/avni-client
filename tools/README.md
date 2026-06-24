# tools/

One-off build & maintenance scripts. Run from the repo root.

## Tanuh branding

Source SVGs live outside the repo at `~/Avni/Tanuh/tanuh_logos/`:
`TANUH.svg`, `Ministry_of_Education_India.svg`, `IISc.svg`.

`build-tanuh-logo.mjs` — composes the 1000×1000 in-app logo (shown on login,
cold-start "splash", server-URL config, and unhandled-error views) into
`packages/openchs-android/android/app/src/tanuh/assets/logo.png`. Layout:
TANUH+MoE paired in the top row, IISc centered below.

`build-tanuh-launcher.mjs` — generates the home-screen launcher icons at all
5 Android densities (mdpi through xxxhdpi) into
`packages/openchs-android/android/app/src/tanuh/res/mipmap-*/`. Emits the
legacy square icon, the round variant, and the adaptive-icon foreground PNG.
The adaptive-icon XMLs and the white background drawable live alongside under
`mipmap-anydpi-v26/` and `drawable/`.

Both scripts depend on `sharp` only. Install once into the isolated
`tools/node_modules/` (kept out of the openchs-android peer-dep graph):

```sh
cd tools && npm install --no-save sharp && cd ..
```

Then from repo root:

```sh
NODE_PATH=tools/node_modules node tools/build-tanuh-logo.mjs
NODE_PATH=tools/node_modules node tools/build-tanuh-launcher.mjs
```

Generated PNGs are checked into git; you only re-run after updating the
source SVGs.

## edge-model/

ONNX Runtime Mobile model packaging for the tanuh flavor. See `edge-model/README.md`.
