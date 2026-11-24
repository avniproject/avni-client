"""Made-up pink-red images with an optional pale patch, for the tests."""

import io

import numpy as np
from PIL import Image


def oral_like(seed: int, patch: int = 0, whiteness: float = 1.0) -> np.ndarray:
    """A 512x512 BGR image; `patch` is the radius in pixels of a pale disc, 0 for none."""
    rng = np.random.default_rng(seed)
    img = np.empty((512, 512, 3), np.float64)
    img[...] = (90, 70, 190)
    img += rng.normal(0, 12, img.shape)
    if patch:
        cy, cx = rng.integers(150, 360, 2)
        yy, xx = np.ogrid[:512, :512]
        mask = (yy - cy) ** 2 + (xx - cx) ** 2 < patch**2
        img[mask] = img[mask] * (1 - whiteness) + 255 * whiteness
    return np.clip(img, 0, 255).astype(np.uint8)


def to_pil(img_bgr: np.ndarray) -> Image.Image:
    return Image.fromarray(img_bgr[..., ::-1].copy(), "RGB")


def jpeg(img_bgr: np.ndarray, exif_orientation: int = 1, quality: int = 95) -> bytes:
    """JPEG bytes of a BGR array, with an EXIF orientation tag when it is not 1."""
    out = io.BytesIO()
    exif = Image.Exif()
    exif[0x0112] = exif_orientation
    to_pil(img_bgr).save(out, "JPEG", quality=quality, subsampling=0, exif=exif)
    return out.getvalue()
