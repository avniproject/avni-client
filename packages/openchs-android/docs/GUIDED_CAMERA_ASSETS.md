# Guided camera — authoring guidance images

What an org must produce so that a framing overlay lines up with the live camera view, and a
reference photo reads clearly in the photo row. The client half of this contract is
`GuidedCameraModal.js`; the org-facing half lives in
`avni-product-ops/analysis/guided-capture/`.

## The pinned aspect ratio: 4:3

The viewfinder is pinned to a **3:4 portrait** box presenting a **4:3 landscape** sensor frame.
Author every overlay and reference photo at **3:4 portrait**.

Two things are pinned together, and both are needed:

- `useCameraFormat` requests a format with `videoAspectRatio: 4/3` **and** `photoAspectRatio: 4/3`.
  The first drives the preview stream, the second drives `takePhoto` — pinning only one lets the
  preview and the saved photo be different shapes on the same device.
- The `<Camera>` sits in a `View` with `aspectRatio: 3/4`. Without it the preview's bounds are the
  whole screen (~9:19.5 on one phone, 9:16 on another, 4:3 on a tablet) and `resizeMode="cover"`
  centre-crops by a device-dependent amount.

With container shape equal to stream shape, `cover` is the identity transform: the container rect
**is** the captured frame, so an overlay filling the container sits in exactly the photo's
coordinate space on every device.

Camera **resolution** does not affect alignment — aspect ratio is scale-invariant, and
`ImageResizer` fits within `maxWidth`/`maxHeight` preserving aspect. A form's `maxWidth`/`maxHeight`
key-values change how large the saved photo is, never its shape.

4:3 was chosen because it is the native sensor readout on essentially every Android camera (16:9
formats are crops of it, so an exact match is normally available), because it matches the existing
1280×960 resize defaults, and because it gives the widest field of view — which matters when the
overlay is an outline the subject has to fit inside.

If a device offers no 4:3 format, the app logs a warning to logcat
(`No 4:3 photo format on this device…`) and degrades to a symmetric centre crop; alignment is then
approximate.

## Recommended asset specs

| | Framing overlay | Reference photo (reckoner) |
|---|---|---|
| Aspect | 3:4 portrait | 3:4 portrait |
| Pixels | 960 × 1280 | 720 × 960 |
| Format | PNG-24 with alpha | JPEG, quality ~80 |
| Interior | fully transparent — outline only | n/a |
| Target size | ≤ 150 KB | ≤ 120 KB |

The overlay is drawn with `resizeMode="stretch"` across the viewfinder, so an asset authored at 3:4
maps 1:1. Anything else is distorted rather than letterboxed — that is deliberate, so a
mis-authored asset is obvious rather than subtly misaligned. The reference photo renders as an
in-row thumbnail at 180dp tall, so 720px is ample.

Sizes matter because a device downloads every guidance image on its first sync: 28 images for the
first org. Record the measured total when authoring.

## Two rules that will otherwise bite in the field

**Publish with `needsKey = false`.** A `needsKey: true` blob is AES-GCM ciphertext. `<Image>` cannot
decode it, so the row will block for ever. Unencrypted also lets the client verify the image's
sha256 after download and reject a corrupt copy.

**Publish as real `DownloadableContent` rows, with both `contentKey` and `sha256`.**
`DownloadableContentService.cleanupSupersededBlobs` runs on every sync and unlinks anything in the
guidance directory that is not a live row. A file placed there by any other means disappears at the
next sync and every guided row goes to `guidanceMissing`.

## Where the files live

Guidance pictures have their own namespace, separate from the AI models:

| | Bucket key | On the device |
|---|---|---|
| Guidance picture | `guidance/<sha256>.png` (or `.jpg`) | `<ExternalDirectoryPath>/Avni/guidance/<sha256>.png` |
| AI model | `models/<sha256>.bin` | `<ExternalDirectoryPath>/Avni/models/<sha256>.bin` |

The separation matters for two reasons. `models/` is a storage *data class* an organisation may route
to a different backend with its own credentials — sharing it would send clinical reference
photographs to wherever that org keeps its AI models. And a real image extension means the device
renders the file directly instead of relying on the renderer to sniff the content type of something
named `.bin`.

Guidance has a storage class of its own, so it is **independently routable**: an organisation that
wants its guidance pictures on a particular backend sets `storageBackends: {guidance: "<target>"}`
in its org config, exactly as it would for `model`. Leave it unset and the pictures stay on the
deploy default. Routing `model` does not drag `guidance` along with it, or the reverse.

The device path mirrors the bucket key verbatim under `Avni/`, so there is nothing to translate
between the two. The rule gets it from
`params.services.downloadableContent.byPayload('guidanceImage', {sequence, kind}).path()`; the row
then checks the file is actually there before rendering it, and blocks capture if it is not.
