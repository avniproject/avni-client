package com.openchsclient.preprocessing

/*
 * Pure-Kotlin image math for the preprocessors — deliberately free of any `android.*` class so
 * it runs (and is unit-tested) on the plain JVM. `Preprocessors.kt` adapts `Bitmap` ⇄ [ArgbImage].
 */

/** Packed ARGB_8888 pixels, row-major — the same layout `Bitmap.getPixels` returns. */
class ArgbImage(val width: Int, val height: Int, val pixels: IntArray) {
    init { require(pixels.size == width * height) { "pixels.size ${pixels.size} != $width x $height" } }
}

/** Where a letterboxed image sits on the target canvas. */
data class LetterboxGeometry(val newW: Int, val newH: Int, val offsetX: Int, val offsetY: Int)

object PixelOps {

    /**
     * Aspect-preserving fit into (targetW, targetH), centred — the QC notebook's
     * `scale = T / max(h, w); new = int(round(w * scale)); offset = (T - new) // 2`.
     * Python's `round` is round-half-to-even, hence `Math.rint`.
     */
    fun letterboxGeometry(srcW: Int, srcH: Int, targetW: Int, targetH: Int): LetterboxGeometry {
        val scale = minOf(targetW.toDouble() / srcW, targetH.toDouble() / srcH)
        val newW = Math.rint(srcW * scale).toInt().coerceIn(1, targetW)
        val newH = Math.rint(srcH * scale).toInt().coerceIn(1, targetH)
        return LetterboxGeometry(newW, newH, (targetW - newW) / 2, (targetH - newH) / 2)
    }

    /** Paste [img] onto a (w, h) canvas filled with opaque [padRgb] (0 = black), top-left at (x0, y0). */
    fun pasteOnCanvas(img: ArgbImage, w: Int, h: Int, x0: Int, y0: Int, padRgb: Int = 0): ArgbImage {
        val out = IntArray(w * h) { (0xFF shl 24) or (padRgb and 0xFFFFFF) }
        for (y in 0 until img.height) {
            System.arraycopy(img.pixels, y * img.width, out, (y + y0) * w + x0, img.width)
        }
        return ArgbImage(w, h, out)
    }

    // ── cv2.resize(..., interpolation=cv2.INTER_CUBIC) for 8-bit, 3-channel images ────────────

    private const val COEF_SCALE = 2048            // INTER_RESIZE_COEF_SCALE
    private const val SIMD_LANES = 8               // v_int16 lanes on NEON / SSE (VResizeCubicVec_32s8u step)

    /** OpenCV `interpolateCubic` (A = -0.75), evaluated in float32 like the C++ code. */
    private fun cubicCoeffs(x: Float, out: FloatArray) {
        val a = -0.75f
        out[0] = ((a * (x + 1f) - 5f * a) * (x + 1f) + 8f * a) * (x + 1f) - 4f * a
        out[1] = ((a + 2f) * x - (a + 3f)) * x * x + 1f
        out[2] = ((a + 2f) * (1f - x) - (a + 3f)) * (1f - x) * (1f - x) + 1f
        out[3] = 1f - out[0] - out[1] - out[2]
    }

    /** Per destination index: 4 clamped (BORDER_REPLICATE) source indices + 4 fixed-point weights. */
    private fun cubicTaps(srcN: Int, dstN: Int): Pair<IntArray, IntArray> {
        val scale = 1.0 / (dstN.toDouble() / srcN)
        val idx = IntArray(dstN * 4)
        val wts = IntArray(dstN * 4)
        val c = FloatArray(4)
        for (d in 0 until dstN) {
            val f0 = ((d + 0.5) * scale - 0.5).toFloat()
            val s = Math.floor(f0.toDouble()).toInt()
            cubicCoeffs(f0 - s, c)
            for (k in 0 until 4) {
                idx[d * 4 + k] = (s - 1 + k).coerceIn(0, srcN - 1)
                wts[d * 4 + k] = Math.rint((c[k] * COEF_SCALE).toDouble()).toInt()   // saturate_cast<short>(float)
            }
        }
        return idx to wts
    }

    /** Fused multiply-add in float32 (NEON `vfmaq` / AVX `fmadd`), emulated via an exact double product. */
    private fun fmaF(a: Float, b: Float, c: Float): Float = (a.toDouble() * b.toDouble() + c.toDouble()).toFloat()

    /**
     * Bit-exact port of OpenCV's 8-bit INTER_CUBIC resize (`resizeGeneric_` with `HResizeCubic`
     * + `VResizeCubic`/`VResizeCubicVec_32s8u`): float32 coefficients quantised to 11-bit fixed
     * point, integer horizontal pass, float32-FMA vertical pass for the vectorised span and the
     * integer `FixedPtCast` for the scalar tail. Verified identical to cv2.resize on the 127
     * benchmark images at several aspect ratios (see tools/edge-model/qc-parity/README.md).
     */
    fun resizeCubicCv(src: ArgbImage, dstW: Int, dstH: Int): ArgbImage {
        if (src.width == dstW && src.height == dstH) return src
        val (xIdx, xW) = cubicTaps(src.width, dstW)
        val (yIdx, yW) = cubicTaps(src.height, dstH)
        val rowLen = dstW * 3                               // interleaved B,G,R — OpenCV's buffer order
        val hRows = arrayOfNulls<IntArray>(src.height)      // horizontal pass, computed lazily per source row

        fun hRow(sy: Int): IntArray = hRows[sy] ?: IntArray(rowLen).also { row ->
            val base = sy * src.width
            for (dx in 0 until dstW) {
                var b = 0; var g = 0; var r = 0
                for (k in 0 until 4) {
                    val px = src.pixels[base + xIdx[dx * 4 + k]]
                    val w = xW[dx * 4 + k]
                    b += (px and 0xFF) * w
                    g += ((px shr 8) and 0xFF) * w
                    r += ((px shr 16) and 0xFF) * w
                }
                row[dx * 3] = b; row[dx * 3 + 1] = g; row[dx * 3 + 2] = r
            }
            hRows[sy] = row
        }

        val vecEnd = (rowLen / SIMD_LANES) * SIMD_LANES
        val fScale = 1f / (COEF_SCALE * COEF_SCALE)
        val out = IntArray(dstW * dstH)
        val line = IntArray(rowLen)
        for (dy in 0 until dstH) {
            val s0 = hRow(yIdx[dy * 4]); val s1 = hRow(yIdx[dy * 4 + 1])
            val s2 = hRow(yIdx[dy * 4 + 2]); val s3 = hRow(yIdx[dy * 4 + 3])
            val w0 = yW[dy * 4]; val w1 = yW[dy * 4 + 1]; val w2 = yW[dy * 4 + 2]; val w3 = yW[dy * 4 + 3]
            val b0 = w0 * fScale; val b1 = w1 * fScale; val b2 = w2 * fScale; val b3 = w3 * fScale
            for (x in 0 until vecEnd) {
                val v = fmaF(s0[x].toFloat(), b0, fmaF(s1[x].toFloat(), b1, fmaF(s2[x].toFloat(), b2, s3[x].toFloat() * b3)))
                line[x] = Math.rint(v.toDouble()).toInt().coerceIn(0, 255)
            }
            for (x in vecEnd until rowLen) {
                val v = s0[x] * w0 + s1[x] * w1 + s2[x] * w2 + s3[x] * w3
                line[x] = ((v + (1 shl 21)) shr 22).coerceIn(0, 255)
            }
            val o = dy * dstW
            for (dx in 0 until dstW) {
                out[o + dx] = (0xFF shl 24) or (line[dx * 3 + 2] shl 16) or (line[dx * 3 + 1] shl 8) or line[dx * 3]
            }
        }
        return ArgbImage(dstW, dstH, out)
    }
}

/**
 * Steps 2-8 of `mean-target-bgr-rounded`: per-image gray-world scaling to [Params.meanTarget],
 * clip, round, uint8 cast, scale, then write BGR/RGB planes in CHW/HWC.
 *
 * Two arithmetic modes:
 *  • `numpyRounding = false` (legacy, unchanged): float64 math, round-half-up (`Math.round`),
 *    `x * scale`.
 *  • `numpyRounding = true` (QC parity): mirrors the reference Python exactly — float32 math
 *    (`img.astype(np.float32)`; `r *= scale_r`), `np.round(x, d)` = rint(x·10ᵈ)/10ᵈ in float32
 *    (round-half-to-EVEN), `cv2.convertScaleAbs` = rint, and torchvision `ToTensor` = u8 / 255f.
 */
object MeanTargetMath {
    data class Params(
        val meanTarget: Double = 128.0,
        val roundDecimals: Int = 1,
        val uint8Cast: Boolean = true,
        val uint8Round: Boolean = false,
        val numpyRounding: Boolean = false,
        val scale: Float = (1.0 / 255.0).toFloat(),
        val channelOrder: String = "BGR",
        val layout: String = "CHW"
    )

    class Stats(val meanR: Double, val meanG: Double, val meanB: Double,
                val scaleR: Double, val scaleG: Double, val scaleB: Double)

    fun toTensor(img: ArgbImage, p: Params, statsOut: ((Stats) -> Unit)? = null): FloatArray {
        val pixels = img.pixels
        val n = pixels.size

        // Per-channel mean over the WHOLE canvas (letterbox padding included — as cv2.mean does).
        var sumR = 0L; var sumG = 0L; var sumB = 0L
        for (px in pixels) {
            sumR += (px shr 16) and 0xFF; sumG += (px shr 8) and 0xFF; sumB += px and 0xFF
        }
        val meanR = sumR.toDouble() / n; val meanG = sumG.toDouble() / n; val meanB = sumB.toDouble() / n
        val scaleR = if (meanR != 0.0) p.meanTarget / meanR else 1.0
        val scaleG = if (meanG != 0.0) p.meanTarget / meanG else 1.0
        val scaleB = if (meanB != 0.0) p.meanTarget / meanB else 1.0
        statsOut?.invoke(Stats(meanR, meanG, meanB, scaleR, scaleG, scaleB))

        val normR = FloatArray(n); val normG = FloatArray(n); val normB = FloatArray(n)
        if (p.numpyRounding) {
            val sR = scaleR.toFloat(); val sG = scaleG.toFloat(); val sB = scaleB.toFloat()
            val f = Math.pow(10.0, p.roundDecimals.toDouble()).toFloat()
            // ToTensor divides by 255 (float32). `scale` arrives as float(1/255), whose reciprocal is
            // 254.99998…, so snap to the integer divisor it stands for; otherwise use it as-is.
            val inv = 1.0 / p.scale
            val div = (if (Math.abs(inv - Math.rint(inv)) < 1e-3) Math.rint(inv) else inv).toFloat()
            fun chan(v: Int, s: Float): Float {
                var x = v.toFloat() * s
                x = if (x < 0f) 0f else if (x > 255f) 255f else x
                x = Math.rint((x * f).toDouble()).toFloat() / f
                return if (p.uint8Cast) Math.rint(x.toDouble()).toInt().coerceIn(0, 255).toFloat() / div
                       else x / div
            }
            for (i in 0 until n) {
                val px = pixels[i]
                normR[i] = chan((px shr 16) and 0xFF, sR)
                normG[i] = chan((px shr 8) and 0xFF, sG)
                normB[i] = chan(px and 0xFF, sB)
            }
        } else {
            val roundFactor = Math.pow(10.0, p.roundDecimals.toDouble())
            fun toU8(v: Double): Int = (if (p.uint8Round) Math.round(v).toInt() else v.toInt()) and 0xFF
            fun chan(v: Int, s: Double): Float {
                var x = v * s
                x = if (x < 0.0) 0.0 else if (x > 255.0) 255.0 else x
                x = Math.round(x * roundFactor) / roundFactor
                return if (p.uint8Cast) toU8(x) * p.scale else x.toFloat() * p.scale
            }
            for (i in 0 until n) {
                val px = pixels[i]
                normR[i] = chan((px shr 16) and 0xFF, scaleR)
                normG[i] = chan((px shr 8) and 0xFF, scaleG)
                normB[i] = chan(px and 0xFF, scaleB)
            }
        }

        val planes = when (p.channelOrder.uppercase()) {
            "BGR" -> arrayOf(normB, normG, normR)
            "RGB" -> arrayOf(normR, normG, normB)
            else  -> throw IllegalArgumentException("Unsupported channel_order='${p.channelOrder}' (use BGR or RGB)")
        }
        val data = FloatArray(3 * n)
        if (p.layout.uppercase() == "CHW") {
            for (c in 0 until 3) System.arraycopy(planes[c], 0, data, c * n, n)
        } else {
            for (i in 0 until n) {
                data[i * 3] = planes[0][i]; data[i * 3 + 1] = planes[1][i]; data[i * 3 + 2] = planes[2][i]
            }
        }
        return data
    }
}
