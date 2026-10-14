package com.openchsclient.preprocessing

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.MessageDigest

/**
 * Parity of the `mean-target-bgr-rounded` preprocessor (resize_mode=letterbox,
 * interpolation=cubic, rounding=numpy) with the QC team's reference pipeline
 * (TANUH_QC/OCS_blackbox.ipynb → tools/edge-model/qc-parity/qc_reference.py).
 *
 * No image files are committed: inputs come from [syntheticImage], a pure-integer formula that
 * tools/edge-model/qc-parity/gen_fixtures.py implements identically in numpy. That script runs
 * the cv2/numpy reference and records, per case, the letterbox geometry and SHA-256 digests of
 * the resized image and the final uint8 BGR image in src/test/resources/qc-parity/manifest.txt.
 * Matching digests = bit-for-bit equality. Pure JVM — PixelOps/MeanTargetMath touch no Android class.
 * To inspect a mismatch: `python3 gen_fixtures.py --debug-png /tmp/qc` writes the reference PNGs.
 */
class QcParityPreprocessTest {

    private data class Case(
        val name: String, val w: Int, val h: Int, val seed: Int,
        val newW: Int, val newH: Int, val offX: Int, val offY: Int,
        val shaResized: String, val shaFinal: String
    )

    private val qcParams = MeanTargetMath.Params(
        meanTarget = 128.0, roundDecimals = 1, uint8Cast = true, numpyRounding = true,
        scale = 0.00392156862745098.toFloat(), channelOrder = "BGR", layout = "CHW"
    )

    private fun cases(): List<Case> {
        val text = javaClass.classLoader!!.getResource("qc-parity/manifest.txt")!!.readText()
        return text.lines().filter { it.isNotBlank() && !it.startsWith("#") }.map {
            val p = it.trim().split(Regex("\\s+"))
            Case(p[0], p[1].toInt(), p[2].toInt(), p[3].toInt(), p[4].toInt(), p[5].toInt(),
                p[6].toInt(), p[7].toInt(), p[8], p[9])
        }.also { assertTrue("no cases in qc-parity/manifest.txt", it.isNotEmpty()) }
    }

    /** Mirror of gen_fixtures.synthetic_image (integer-only so both languages agree exactly). */
    private fun syntheticImage(w: Int, h: Int, seed: Int): ArgbImage {
        val m32 = 0xFFFFFFFFL
        val chans = Array(3) { IntArray(w * h) }
        for (c in 0 until 3) {
            val k = seed * 31 + c * 7
            val base = 40 + (k * 13) % 90
            val gx = 60 + k % 50
            val gy = 40 + (k * 3) % 70
            val discs = (0 until 4).map { d ->
                val r = maxOf(4, minOf(w, h) * (10 + (k + d * 17) % 25) / 100)
                intArrayOf((k * 97 + d * 211) % w, (k * 53 + d * 137) % h, r, (k * 29 + d * 61) % 141 - 70)
            }
            for (y in 0 until h) for (x in 0 until w) {
                var v = base + (x * gx) / w + (y * gy) / h
                for (dd in discs) {
                    val dx = (x - dd[0]).toLong(); val dy = (y - dd[1]).toLong()
                    val d2 = dx * dx + dy * dy; val r2 = dd[2].toLong() * dd[2]
                    v += if (d2 < r2) dd[3] else if (d2 < 4 * r2) Math.floorDiv(dd[3], 2) else 0
                }
                var hsh = ((x * 73856093L) xor (y * 19349663L) xor ((c + 1) * 83492791L) xor (seed * 2654435761L)) and m32
                hsh = (hsh * 2246822519L) and m32
                v += ((hsh ushr 16) % 25).toInt() - 12
                chans[c][y * w + x] = v.coerceIn(0, 255)
            }
        }
        val px = IntArray(w * h) { i -> (0xFF shl 24) or (chans[2][i] shl 16) or (chans[1][i] shl 8) or chans[0][i] }
        return ArgbImage(w, h, px)
    }

    /** SHA-256 of the image as interleaved B,G,R bytes, row-major — numpy's (h, w, 3) BGR layout. */
    private fun shaBgr(img: ArgbImage): String {
        val b = ByteArray(img.pixels.size * 3)
        for (i in img.pixels.indices) {
            val p = img.pixels[i]
            b[i * 3] = (p and 0xFF).toByte(); b[i * 3 + 1] = ((p shr 8) and 0xFF).toByte(); b[i * 3 + 2] = ((p shr 16) and 0xFF).toByte()
        }
        return MessageDigest.getInstance("SHA-256").digest(b).joinToString("") { "%02x".format(it) }
    }

    @Test
    fun letterboxGeometryMatchesNotebook() {
        for (c in cases()) {
            assertEquals(c.name, LetterboxGeometry(c.newW, c.newH, c.offX, c.offY),
                PixelOps.letterboxGeometry(c.w, c.h, 256, 256))
        }
        // Python round() is half-to-even: 3000x4000 → 192x256, 4000x3000 → 256x192, 3072² → 256².
        assertEquals(LetterboxGeometry(192, 256, 32, 0), PixelOps.letterboxGeometry(3000, 4000, 256, 256))
        assertEquals(LetterboxGeometry(256, 192, 0, 32), PixelOps.letterboxGeometry(4000, 3000, 256, 256))
        assertEquals(LetterboxGeometry(256, 256, 0, 0), PixelOps.letterboxGeometry(3072, 3072, 256, 256))
    }

    @Test
    fun cubicResizeIsBitExactWithCv2() {
        for (c in cases()) {
            val resized = PixelOps.resizeCubicCv(syntheticImage(c.w, c.h, c.seed), c.newW, c.newH)
            assertEquals("${c.name}: cubic resize differs from cv2.resize(INTER_CUBIC)", c.shaResized, shaBgr(resized))
        }
    }

    @Test
    fun tensorIsBitExactWithQcNotebook() {
        val plane = 256 * 256
        for (c in cases()) {
            val g = PixelOps.letterboxGeometry(c.w, c.h, 256, 256)
            val resized = PixelOps.resizeCubicCv(syntheticImage(c.w, c.h, c.seed), g.newW, g.newH)
            val canvas = PixelOps.pasteOnCanvas(resized, 256, 256, g.offsetX, g.offsetY, 0)
            val t = MeanTargetMath.toTensor(canvas, qcParams)
            // tensor = u8 / 255f in B,G,R planes; every value must be an exact u8/255f
            val u8 = IntArray(3 * plane)
            for (i in t.indices) {
                val u = Math.round(t[i] * 255f)
                assertEquals("${c.name}: tensor[$i] is not u8/255", u / 255f, t[i], 0f)
                u8[i] = u
            }
            val img = ArgbImage(256, 256, IntArray(plane) { i -> (0xFF shl 24) or (u8[2 * plane + i] shl 16) or (u8[plane + i] shl 8) or u8[i] })
            assertEquals("${c.name}: tensor differs from QC notebook", c.shaFinal, shaBgr(img))
        }
    }

    @Test
    fun legacyModeUnchanged() {
        // Previous behaviour (float64 + round-half-up) must still be selectable.
        val img = ArgbImage(1, 1, intArrayOf((0xFF shl 24) or (128 shl 16) or (128 shl 8) or 128))
        val t = MeanTargetMath.toTensor(img, MeanTargetMath.Params(uint8Round = true, numpyRounding = false))
        assertEquals(128 * (1.0 / 255.0).toFloat(), t[0], 0f)
    }

    @Test
    fun numpyRoundingIsHalfToEven() {
        // Pixels {3, 253} have mean 128; with mean_target 64 the scale is exactly 0.5, giving
        // 1.5 and 126.5 — exact .5 ties. numpy/cv2 round half-to-even (2, 126); legacy rounds up (127).
        val px = { v: Int -> (0xFF shl 24) or (v shl 16) or (v shl 8) or v }
        val img = ArgbImage(2, 1, intArrayOf(px(3), px(253)))
        val t = MeanTargetMath.toTensor(img, qcParams.copy(meanTarget = 64.0))
        assertEquals(2 / 255f, t[0], 0f)    // 1.5 → 2
        assertEquals(126 / 255f, t[1], 0f)  // 126.5 → 126 (legacy would give 127)
        val legacy = MeanTargetMath.toTensor(img, MeanTargetMath.Params(meanTarget = 64.0, uint8Round = true))
        assertEquals(127 * (1.0 / 255.0).toFloat(), legacy[1], 0f)
    }
}
