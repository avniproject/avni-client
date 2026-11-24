package com.openchsclient.preprocessing

import android.graphics.Bitmap
import android.os.Build
import android.util.Log
import com.openchsclient.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer

/**
 * Named registry of image preprocessors.
 *
 * Lookup is by string identifier in the registry override JSON:
 *
 *   "input": { "preprocessor": "<name>", "params": { ... } }
 *
 * Two implementations ship initially:
 *
 *   • `imagenet-rgb-chw`        — standard mean/std normalisation, RGB, CHW.
 *   • `mean-target-bgr-rounded` — TANUH QC pipeline (letterbox / gray-world 128 / BGR / round-1dp).
 *
 * Adding a new pipeline = write a new class implementing `ImagePreprocessor`, add it to
 * `REGISTRY` by name. The bridge does not need to know about it.
 */
object Preprocessors {
    val REGISTRY: Map<String, ImagePreprocessor> = mapOf(
        "imagenet-rgb-chw"        to ImagenetRgbChwPreprocessor,
        "mean-target-bgr-rounded" to MeanTargetBgrRoundedPreprocessor
    )

    fun resolve(name: String): ImagePreprocessor =
        REGISTRY[name] ?: throw IllegalArgumentException(
            "Unknown preprocessor '$name'. Known: ${REGISTRY.keys}. " +
            "Add a new ImagePreprocessor and register it in Preprocessors.REGISTRY."
        )
}

/* ── Helpers ──────────────────────────────────────────────────────────────────────── */

private fun JSONObject.optFloatArray(key: String): FloatArray? {
    val arr: JSONArray = optJSONArray(key) ?: return null
    return FloatArray(arr.length()) { i -> arr.getDouble(i).toFloat() }
}

private fun JSONObject.optIntPair(key: String, defW: Int, defH: Int): Pair<Int, Int> {
    val arr: JSONArray = optJSONArray(key) ?: return defW to defH
    val w = if (arr.length() > 0) arr.getInt(0) else defW
    val h = if (arr.length() > 1) arr.getInt(1) else defH
    return w to h
}

/**
 * Bitmap → [ArgbImage] (packed ARGB_8888, row-major).
 *
 * `ignoreColorProfile = false` (default, previous behaviour): `Bitmap.getPixels`, which converts a
 * non-sRGB bitmap (e.g. a Display P3 photo) to sRGB. `true`: for a non-sRGB ARGB_8888 bitmap, copy
 * the raw pixel memory instead, so the values are exactly those stored in the file — matching
 * cv2.imread, which ignores embedded ICC profiles. sRGB bitmaps are identical either way.
 */
private fun Bitmap.toArgbImage(ignoreColorProfile: Boolean = false): ArgbImage {
    if (ignoreColorProfile && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && config == Bitmap.Config.ARGB_8888) {
        val cs = colorSpace
        if (cs != null && !cs.isSrgb) {
            val buf = ByteBuffer.allocate(rowBytes * height)
            copyPixelsToBuffer(buf)
            return ArgbImage(width, height, PixelOps.argbFromRgba8888(buf.array(), width, height, rowBytes))
        }
    }
    val px = IntArray(width * height)
    getPixels(px, 0, width, 0, 0, width, height)
    return ArgbImage(width, height, px)
}

/**
 * Resize to (w, h). `"bilinear"` (default) and `"nearest"` use Android's native scaler;
 * `"cubic"` runs [PixelOps.resizeCubicCv], a bit-exact port of cv2.INTER_CUBIC (Android's
 * Bitmap API has no native bicubic).
 */
private fun resize(src: Bitmap, w: Int, h: Int, interpolation: String, ignoreColorProfile: Boolean = false): ArgbImage {
    if (src.width == w && src.height == h) return src.toArgbImage(ignoreColorProfile)
    return when (interpolation) {
        "cubic"   -> PixelOps.resizeCubicCv(src.toArgbImage(ignoreColorProfile), w, h)
        "nearest" -> Bitmap.createScaledBitmap(src, w, h, false).let { s -> s.toArgbImage(ignoreColorProfile).also { if (s !== src) s.recycle() } }
        else      -> Bitmap.createScaledBitmap(src, w, h, true).let { s -> s.toArgbImage(ignoreColorProfile).also { if (s !== src) s.recycle() } }
    }
}

/**
 * Resize to the (w, h) canvas according to `resize_mode`:
 *   • `"stretch"`   (default, legacy) — resize straight to (w, h), ignoring aspect ratio.
 *   • `"letterbox"` (QC notebook, Oct 2026) — aspect-preserving resize so the image fits inside
 *     (w, h), centred on a canvas filled with `pad_value` (default 0 = black).
 */
private fun resizeToCanvas(src: Bitmap, w: Int, h: Int, interpolation: String, mode: String, padValue: Int,
                           ignoreColorProfile: Boolean = false): ArgbImage =
    when (mode) {
        "stretch"   -> resize(src, w, h, interpolation, ignoreColorProfile)
        "letterbox" -> {
            val g = PixelOps.letterboxGeometry(src.width, src.height, w, h)
            val fitted = resize(src, g.newW, g.newH, interpolation, ignoreColorProfile)
            val pad = padValue.coerceIn(0, 255)
            PixelOps.pasteOnCanvas(fitted, w, h, g.offsetX, g.offsetY, (pad shl 16) or (pad shl 8) or pad)
        }
        else -> throw IllegalArgumentException("Unsupported resize_mode='$mode' (use stretch or letterbox)")
    }

/* ── imagenet-rgb-chw ─────────────────────────────────────────────────────────────── */

/**
 * Standard ImageNet-style normalisation. Params:
 *
 *   {
 *     "size": [W, H],          // default 224×224
 *     "channels": 3,           // default 3
 *     "scale": 0.003921568,    // default 1/255
 *     "mean":  [0.485, 0.456, 0.406],
 *     "std":   [0.229, 0.224, 0.225],
 *     "interpolation": "bilinear"
 *   }
 *
 * Output layout: CHW, shape [1, channels, H, W].
 */
object ImagenetRgbChwPreprocessor : ImagePreprocessor {
    private val DEFAULT_MEAN = floatArrayOf(0.485f, 0.456f, 0.406f)
    private val DEFAULT_STD  = floatArrayOf(0.229f, 0.224f, 0.225f)

    override fun preprocess(bitmap: Bitmap, params: JSONObject): ImagePreprocessor.Result {
        val (w, h) = params.optIntPair("size", 224, 224)
        val channels = params.optInt("channels", 3)
        val scale = params.optDouble("scale", 1.0 / 255.0).toFloat()
        val mean = params.optFloatArray("mean") ?: DEFAULT_MEAN
        val std  = params.optFloatArray("std")  ?: DEFAULT_STD
        val interpolation = params.optString("interpolation", "bilinear")

        val pixels = resize(bitmap, w, h, interpolation).pixels

        val data = FloatArray(channels * h * w)
        val plane = h * w
        for (i in 0 until plane) {
            val px = pixels[i]
            val r = ((px shr 16) and 0xFF) * scale
            val g = ((px shr 8) and 0xFF)  * scale
            val b = (px and 0xFF)            * scale
            data[i]             = (r - mean[0]) / std[0]
            data[i + plane]     = (g - mean[1]) / std[1]
            data[i + 2 * plane] = (b - mean[2]) / std[2]
        }
        return ImagePreprocessor.Result(data, longArrayOf(1, channels.toLong(), h.toLong(), w.toLong()))
    }
}

/* ── mean-target-bgr-rounded ──────────────────────────────────────────────────────── */

/**
 * TANUH QC pipeline (`OCS_blackbox.ipynb`, QC team, Oct 2026). Params:
 *
 *   {
 *     "size": [256, 256],
 *     "resize_mode": "letterbox",    // "stretch" (legacy default) | "letterbox" (QC: aspect-preserving,
 *                                    //   centred on a pad_value canvas; gray-world mean includes the padding)
 *     "pad_value": 0,                // letterbox canvas fill (0 = black, as the notebook)
 *     "ignore_color_profile": true,  // read stored pixel values of non-sRGB (e.g. Display P3) photos without
 *                                    //   Android's sRGB conversion — as cv2.imread does (default false = legacy)
 *     "interpolation": "cubic",      // cv2.INTER_CUBIC (bit-exact port); "bilinear"/"nearest" also supported
 *     "channel_order": "BGR",        // blue → channel 0, green → 1, red → 2
 *     "layout": "CHW",
 *     "scale": 0.00392156862745098,  // 1/255 — applied AFTER the uint8 cast
 *     "mean_target": 128,            // per-channel scale = mean_target / per-image mean
 *     "round_decimals": 1,           // np.round(x, 1)
 *     "uint8_cast": true,            // cast to uint8 before /255
 *     "uint8_round": true,           // legacy mode only: round (true) vs truncate (false)
 *     "rounding": "numpy"            // "numpy" = float32 math + round-half-to-even, exactly as numpy/cv2/torchvision;
 *                                    // "legacy" (default) = float64 + round-half-up (previous behaviour)
 *   }
 *
 * Pipeline:
 *   1. Resize to the canvas (stretch, or letterbox + pad).
 *   2. Per-channel pixel mean over the whole canvas.
 *   3. Scale each channel so mean → mean_target.
 *   4. Clip [0, 255].   5. Round to N decimals.   6. uint8 cast.   7. × scale.
 *   8. Write CHW/HWC float buffer in channel_order.
 * Steps 2-8 live in [MeanTargetMath] (pure Kotlin, JVM-unit-tested against the QC notebook).
 */
object MeanTargetBgrRoundedPreprocessor : ImagePreprocessor {
    override fun preprocess(bitmap: Bitmap, params: JSONObject): ImagePreprocessor.Result {
        val (w, h) = params.optIntPair("size", 256, 256)
        val interpolation = params.optString("interpolation", "bilinear")
        val resizeMode = params.optString("resize_mode", "stretch")
        val padValue = params.optInt("pad_value", 0)
        val ignoreColorProfile = params.optBoolean("ignore_color_profile", false)
        val rounding = params.optString("rounding", "legacy")
        require(rounding == "legacy" || rounding == "numpy") { "Unsupported rounding='$rounding' (use legacy or numpy)" }
        val p = MeanTargetMath.Params(
            meanTarget = params.optDouble("mean_target", 128.0),
            roundDecimals = params.optInt("round_decimals", 1),
            uint8Cast = params.optBoolean("uint8_cast", true),
            uint8Round = params.optBoolean("uint8_round", false),
            numpyRounding = rounding == "numpy",
            scale = params.optDouble("scale", 1.0 / 255.0).toFloat(),
            channelOrder = params.optString("channel_order", "BGR"),
            layout = params.optString("layout", "CHW")
        )

        val canvas = resizeToCanvas(bitmap, w, h, interpolation, resizeMode, padValue, ignoreColorProfile)
        var stats: MeanTargetMath.Stats? = null
        val data = MeanTargetMath.toTensor(canvas, p) { stats = it }

        // Diagnostic logging — per-channel input stats for parity debugging against the QC
        // notebook on the same image. Gated behind BuildConfig.DEBUG.
        if (BuildConfig.DEBUG) {
            val plane = h * w
            val s = stats!!
            Log.d("Preproc", "MeanTargetBgrRounded: w=$w h=$h resize=$resizeMode interp=$interpolation " +
                "ignoreColorProfile=$ignoreColorProfile colorSpace=${if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) bitmap.colorSpace?.name else "n/a"} " +
                "order=${p.channelOrder} layout=${p.layout} scale=${p.scale} meanTarget=${p.meanTarget} " +
                "round=${p.roundDecimals} rounding=$rounding uint8Cast=${p.uint8Cast} uint8Round=${p.uint8Round}")
            Log.d("Preproc", "  rawPixelMean: R=%.4f G=%.4f B=%.4f".format(s.meanR, s.meanG, s.meanB))
            Log.d("Preproc", "  perChannelScale: R=%.6f G=%.6f B=%.6f".format(s.scaleR, s.scaleG, s.scaleB))
            Log.d("Preproc", "  tensorStats: ${planeSummary("plane0", data, 0, plane)}")
            Log.d("Preproc", "  tensorStats: ${planeSummary("plane1", data, plane, plane)}")
            Log.d("Preproc", "  tensorStats: ${planeSummary("plane2", data, 2 * plane, plane)}")
        }

        return ImagePreprocessor.Result(data, longArrayOf(1, 3, h.toLong(), w.toLong()))
    }

    /** Diagnostic-only helper. Per-plane mean / min / max / first-3-pixels summary. */
    private fun planeSummary(label: String, data: FloatArray, offset: Int, plane: Int): String {
        var sum = 0.0
        var lo = Float.POSITIVE_INFINITY
        var hi = Float.NEGATIVE_INFINITY
        for (i in 0 until plane) {
            val v = data[offset + i]
            sum += v
            if (v < lo) lo = v
            if (v > hi) hi = v
        }
        val mean = sum / plane
        val sample = (0 until 3).map { data[offset + it] }
        return "%s mean=%.6f min=%.6f max=%.6f first3=%s".format(label, mean, lo, hi, sample)
    }
}
