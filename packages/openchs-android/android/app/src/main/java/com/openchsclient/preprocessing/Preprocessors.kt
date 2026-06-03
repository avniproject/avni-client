package com.openchsclient.preprocessing

import android.graphics.Bitmap
import android.util.Log
import com.openchsclient.BuildConfig
import org.json.JSONArray
import org.json.JSONObject

/**
 * Named registry of image preprocessors (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Lookup is by string identifier in the registry override JSON:
 *
 *   "input": { "preprocessor": "<name>", "params": { ... } }
 *
 * Two implementations ship initially:
 *
 *   • `imagenet-rgb-chw`        — standard mean/std normalisation, RGB, CHW.
 *   • `mean-target-bgr-rounded` — exact port of the TANUH PoC pipeline.
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
 * Resize to (w, h). `"bilinear"` (default) and `"nearest"` use Android's native scaler;
 * `"cubic"` runs [bicubicResize] for cv2.INTER_CUBIC parity (Android's Bitmap API has no
 * native bicubic).
 */
private fun resize(src: Bitmap, w: Int, h: Int, interpolation: String): Bitmap {
    if (src.width == w && src.height == h) return src
    return when (interpolation) {
        "cubic"   -> bicubicResize(src, w, h)
        "nearest" -> Bitmap.createScaledBitmap(src, w, h, false)
        else      -> Bitmap.createScaledBitmap(src, w, h, true)   // bilinear
    }
}

/**
 * Bicubic resize matching cv2.INTER_CUBIC: 4×4 cubic-convolution kernel with a = -0.75,
 * pixel-centre coordinate alignment, and clamped edge sampling. Close to OpenCV but not
 * bit-identical (OpenCV uses fixed-point taps and its own border rounding).
 */
private fun bicubicResize(src: Bitmap, dstW: Int, dstH: Int): Bitmap {
    val srcW = src.width
    val srcH = src.height
    val srcPx = IntArray(srcW * srcH)
    src.getPixels(srcPx, 0, srcW, 0, 0, srcW, srcH)

    val a = -0.75
    fun cubic(d: Double): Double {
        val t = if (d < 0) -d else d
        return when {
            t <= 1.0 -> (a + 2.0) * t * t * t - (a + 3.0) * t * t + 1.0
            t < 2.0  -> a * t * t * t - 5.0 * a * t * t + 8.0 * a * t - 4.0 * a
            else     -> 0.0
        }
    }

    val scaleX = srcW.toDouble() / dstW
    val scaleY = srcH.toDouble() / dstH
    val out = IntArray(dstW * dstH)
    val wy = DoubleArray(4)  // reused per row
    val wx = DoubleArray(4)  // reused per pixel — avoids dstW*dstH short-lived allocations

    for (dy in 0 until dstH) {
        val sy = (dy + 0.5) * scaleY - 0.5
        val y0 = Math.floor(sy).toInt()
        val fy = sy - y0
        wy[0] = cubic(1.0 + fy); wy[1] = cubic(fy); wy[2] = cubic(1.0 - fy); wy[3] = cubic(2.0 - fy)
        for (dx in 0 until dstW) {
            val sx = (dx + 0.5) * scaleX - 0.5
            val x0 = Math.floor(sx).toInt()
            val fx = sx - x0
            wx[0] = cubic(1.0 + fx); wx[1] = cubic(fx); wx[2] = cubic(1.0 - fx); wx[3] = cubic(2.0 - fx)

            var accR = 0.0; var accG = 0.0; var accB = 0.0
            for (m in -1..2) {
                val yy = (y0 + m).coerceIn(0, srcH - 1)
                val rowOff = yy * srcW
                val wyv = wy[m + 1]
                for (n in -1..2) {
                    val xx = (x0 + n).coerceIn(0, srcW - 1)
                    val px = srcPx[rowOff + xx]
                    val w = wyv * wx[n + 1]
                    accR += (((px shr 16) and 0xFF) * w)
                    accG += (((px shr 8) and 0xFF) * w)
                    accB += ((px and 0xFF) * w)
                }
            }
            val r = Math.round(accR).toInt().coerceIn(0, 255)
            val g = Math.round(accG).toInt().coerceIn(0, 255)
            val b = Math.round(accB).toInt().coerceIn(0, 255)
            out[dy * dstW + dx] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
    }
    return Bitmap.createBitmap(out, dstW, dstH, Bitmap.Config.ARGB_8888)
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

        val resized = resize(bitmap, w, h, interpolation)
        val pixels = IntArray(w * h)
        resized.getPixels(pixels, 0, w, 0, 0, w, h)

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
 * Exact port of the TANUH PoC's preprocessing pipeline (`MainActivity.kt:146-211` in
 * `~/IdeaProjects/aiapp`). The math is unusual but matches what the model was trained
 * against — replicate bit-for-bit. Params:
 *
 *   {
 *     "size": [256, 256],
 *     "interpolation": "cubic",      // bicubic (cv2.INTER_CUBIC) — the reference Python's resize.
 *                                    // "bilinear"/"nearest" also supported; see resize().
 *     "channel_order": "BGR",        // PoC writes blue → channel 0, green → 1, red → 2
 *     "layout": "CHW",
 *     "scale": 0.00392156862745098,  // 1/255 — applied AFTER the uint8 cast
 *     "mean_target": 128,            // per-channel scale = mean_target / per-image mean
 *     "round_decimals": 1,           // np.round(x, 1)
 *     "uint8_cast": true             // (val.toInt() and 0xFF) before /255
 *   }
 *
 * Pipeline (each step matches a comment block in the PoC):
 *   1. Resize to (W, H) bilinear.
 *   2. Compute per-channel pixel-mean over the resized image.
 *   3. Scale each channel so mean → mean_target. (Per-image dynamic, not per-batch fixed.)
 *   4. Clip [0, 255].
 *   5. Round to N decimal places.
 *   6. uint8-cast (truncate to int, mask 0xFF).
 *   7. Divide by 255 → [0, 1] float.
 *   8. Write to CHW float buffer in channel_order (BGR for the PoC).
 */
object MeanTargetBgrRoundedPreprocessor : ImagePreprocessor {
    override fun preprocess(bitmap: Bitmap, params: JSONObject): ImagePreprocessor.Result {
        val (w, h) = params.optIntPair("size", 256, 256)
        val interpolation = params.optString("interpolation", "bilinear")
        val channelOrder = params.optString("channel_order", "BGR")
        val layout = params.optString("layout", "CHW")
        val scale = params.optDouble("scale", 1.0 / 255.0).toFloat()
        val meanTarget = params.optDouble("mean_target", 128.0)
        val roundDecimals = params.optInt("round_decimals", 1)
        val uint8Cast = params.optBoolean("uint8_cast", true)

        val resized = resize(bitmap, w, h, interpolation)
        val pixels = IntArray(w * h)
        resized.getPixels(pixels, 0, w, 0, 0, w, h)

        // 2. Per-channel pixel-mean over the resized image.
        var sumR = 0.0; var sumG = 0.0; var sumB = 0.0
        for (px in pixels) {
            sumR += ((px shr 16) and 0xFF).toDouble()
            sumG += ((px shr 8) and 0xFF).toDouble()
            sumB += (px and 0xFF).toDouble()
        }
        val count = pixels.size.toDouble()
        val meanR = sumR / count
        val meanG = sumG / count
        val meanB = sumB / count

        // 3. Per-channel scaling factor.
        val scaleR = if (meanR != 0.0) meanTarget / meanR else 1.0
        val scaleG = if (meanG != 0.0) meanTarget / meanG else 1.0
        val scaleB = if (meanB != 0.0) meanTarget / meanB else 1.0

        // 4-7. Build per-pixel normalised channel values (in source-pixel RGB order).
        val roundFactor = Math.pow(10.0, roundDecimals.toDouble())
        val normR = FloatArray(pixels.size)
        val normG = FloatArray(pixels.size)
        val normB = FloatArray(pixels.size)
        for (i in pixels.indices) {
            val px = pixels[i]
            var r = ((px shr 16) and 0xFF) * scaleR
            var g = ((px shr 8) and 0xFF)  * scaleG
            var b = (px and 0xFF)            * scaleB

            r = if (r < 0.0) 0.0 else if (r > 255.0) 255.0 else r
            g = if (g < 0.0) 0.0 else if (g > 255.0) 255.0 else g
            b = if (b < 0.0) 0.0 else if (b > 255.0) 255.0 else b

            r = Math.round(r * roundFactor) / roundFactor
            g = Math.round(g * roundFactor) / roundFactor
            b = Math.round(b * roundFactor) / roundFactor

            normR[i] = if (uint8Cast) ((r.toInt() and 0xFF) * scale) else (r.toFloat() * scale)
            normG[i] = if (uint8Cast) ((g.toInt() and 0xFF) * scale) else (g.toFloat() * scale)
            normB[i] = if (uint8Cast) ((b.toInt() and 0xFF) * scale) else (b.toFloat() * scale)
        }

        // 8. Write to CHW or HWC in the requested channel order.
        val plane = h * w
        val data = FloatArray(3 * plane)
        val orderedPlanes = when (channelOrder.uppercase()) {
            "BGR" -> arrayOf(normB, normG, normR)
            "RGB" -> arrayOf(normR, normG, normB)
            else  -> throw IllegalArgumentException("Unsupported channel_order='$channelOrder' (use BGR or RGB)")
        }
        if (layout.uppercase() == "CHW") {
            for (c in 0 until 3) {
                System.arraycopy(orderedPlanes[c], 0, data, c * plane, plane)
            }
        } else { // HWC
            for (i in 0 until plane) {
                data[i * 3]     = orderedPlanes[0][i]
                data[i * 3 + 1] = orderedPlanes[1][i]
                data[i * 3 + 2] = orderedPlanes[2][i]
            }
        }

        // Diagnostic logging — emits per-channel input stats so we can compare against the
        // TANUH PoC (~/IdeaProjects/aiapp) on the same image. If the model saturates on
        // both apps, the model is the issue. If it saturates here but not on the PoC, the
        // divergence is in this preprocessor and one of these stats will differ. Gated
        // behind BuildConfig.DEBUG so release builds skip the planeSummary traversals.
        if (BuildConfig.DEBUG) {
            Log.d("Preproc", "MeanTargetBgrRounded: w=$w h=$h interp=$interpolation order=$channelOrder layout=$layout " +
                "scale=$scale meanTarget=$meanTarget round=$roundDecimals uint8Cast=$uint8Cast")
            Log.d("Preproc", "  rawPixelMean: R=%.4f G=%.4f B=%.4f".format(meanR, meanG, meanB))
            Log.d("Preproc", "  perChannelScale: R=%.6f G=%.6f B=%.6f".format(scaleR, scaleG, scaleB))
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
