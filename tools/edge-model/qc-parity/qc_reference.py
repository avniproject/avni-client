"""
QC-team reference preprocessing — a verbatim copy of `preprocess_image` from
TANUH_QC/OCS_blackbox.ipynb (Oct 2026), split so intermediate images can be inspected.

This file is the source of truth the Kotlin `mean-target-bgr-rounded` preprocessor
(resize_mode=letterbox, interpolation=cubic, rounding=numpy) must reproduce. If the QC
notebook changes, update this file first, regenerate fixtures (gen_fixtures.py) and re-run
the JVM unit test.
"""
import cv2
import numpy as np

TARGET_SIZE = 256


def letterbox(img, target=TARGET_SIZE):
    """Aspect-preserving INTER_CUBIC resize + centre on a black target x target canvas."""
    h, w = img.shape[:2]
    scale = target / max(h, w)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    padded = np.zeros((target, target, 3), dtype=np.uint8)
    x_off = (target - new_w) // 2
    y_off = (target - new_h) // 2
    padded[y_off:y_off + new_h, x_off:x_off + new_w] = resized
    return resized, padded


def white_balance_u8(padded):
    """Gray-world to 128, clip, round(1), convertScaleAbs. Returns the BGR uint8 image."""
    img_float = padded.astype(np.float32)
    b, g, r = cv2.split(img_float)
    b_mean, g_mean, r_mean = cv2.mean(b)[0], cv2.mean(g)[0], cv2.mean(r)[0]
    scale_r = 128.0 / r_mean if r_mean != 0 else 1.0
    scale_g = 128.0 / g_mean if g_mean != 0 else 1.0
    scale_b = 128.0 / b_mean if b_mean != 0 else 1.0
    r *= scale_r
    g *= scale_g
    b *= scale_b
    scaled = cv2.merge([b, g, r])
    b_ch, g_ch, r_ch = cv2.split(scaled)
    clipped = cv2.merge([np.clip(b_ch, 0.0, 255.0), np.clip(g_ch, 0.0, 255.0), np.clip(r_ch, 0.0, 255.0)])
    b12, g12, r12 = cv2.split(clipped)
    clipped = cv2.merge([np.round(b12, 1), np.round(g12, 1), np.round(r12, 1)])
    return cv2.convertScaleAbs(clipped)


def preprocess_bgr(img):
    """cv2 BGR image -> model input tensor [1,3,256,256] float32, channel 0 = B (as the notebook)."""
    _, padded = letterbox(img)
    u8 = white_balance_u8(padded)
    # notebook: BGR->RGB, ToTensor (/255 float32, CHW), then [2,1,0] back to BGR planes
    rgb = cv2.cvtColor(u8, cv2.COLOR_BGR2RGB)
    t = (rgb.astype(np.float32) / np.float32(255.0)).transpose(2, 0, 1)[[2, 1, 0]]
    return np.ascontiguousarray(t[None])


def preprocess_path(path):
    img = cv2.imread(str(path))
    if img is None:
        raise FileNotFoundError(path)
    return preprocess_bgr(img)
