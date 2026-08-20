package com.openchsclient.camera

import android.util.Log
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgcodecs.Imgcodecs
import org.opencv.imgproc.Imgproc
import java.io.IOException

/**
 * Image pre-processing utilities backed by OpenCV.
 *
 * Ported from fhir-app's `org.smartregister.fhircore.quest.util.OpenCVUtils`
 * (camera usability enhancement, Phase 2 — image quality scoring). Logic is
 * unchanged from the reference implementation; only the package (renamed to
 * `com.openchsclient.camera`, TANUH-only per src/tanuh scoping) and the
 * logging call (Timber -> android.util.Log, since this app doesn't carry a
 * Timber dependency) differ.
 *
 * The OpenCV native library (`opencv_java4`) is loaded once on first access of
 * this object. If loading fails it is logged but not fatal — subsequent calls
 * into OpenCV will throw `UnsatisfiedLinkError` and be caught by the per-call
 * try/catch in [scaleImageMat].
 */
object OpenCVUtils {

    private const val TAG = "OpenCVUtils"

    // ─────────────────────────────────────────────────────────────────────
    // Pipeline constants
    // ─────────────────────────────────────────────────────────────────────

    /** Width and height (px) the quality scorer (and, if used later, an AI model) expects as input. */
    private const val TARGET_WIDTH = 256.0
    private const val TARGET_HEIGHT = 256.0

    /**
     * Target mean intensity per BGR channel after normalization.
     *
     * 128.0 is the midpoint of the 0–255 pixel range. Scaling each channel so
     * that its average pixel value lands at this midpoint compensates for
     * exposure / lighting differences between source photos, so quality
     * scoring (and any downstream model) sees consistently-lit input
     * regardless of how the photo was taken.
     */
    private const val TARGET_CHANNEL_MEAN = 128.0

    /** Valid 8-bit pixel range used when clipping after normalization. */
    private const val PIXEL_MIN = 0.0
    private const val PIXEL_MAX = 255.0

    /** Multiplier used to round float values to one decimal place. */
    private const val ONE_DECIMAL_SHIFT = 10.0

    /** Wall-clock duration (ms) of the most recent [scaleImageMat] call. */
    private var lastScaleImageTime: Long = 0L

    init {
        try {
            System.loadLibrary("opencv_java4")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load opencv_java4 native library", e)
        }
    }

    /**
     * Pre-processes an image so it's in a consistent format for quality scoring.
     *
     * The pipeline runs these steps in order:
     *  1. **Decode** — read the file from disk into an OpenCV Mat (BGR layout).
     *  2. **Resize** — scale to 256×256 using bicubic interpolation.
     *  3. **Convert to float** — promote to CV_32FC3 so multiply / divide below
     *     do not overflow or lose precision.
     *  4. **Per-channel mean normalization** — scale each of the B, G, R
     *     channels so its average pixel value becomes [TARGET_CHANNEL_MEAN].
     *     This balances white balance across images.
     *  5. **Clip** — push any pixel that scaling drove outside [0, 255] back
     *     into range.
     *  6. **Round to 1 decimal** — match the precision of the reference
     *     (fhir-app) pipeline so floating-point drift does not change scoring.
     *  7. **Back to CV_8UC3** — convert to the standard 8-bit unsigned BGR Mat
     *     the caller expects.
     *
     * ### Memory management
     *
     * Every intermediate [Mat] is tracked in a single `cleanup` list and released
     * in `finally`. OpenCV Mat wraps off-heap native memory that the JVM garbage
     * collector cannot reclaim, so forgetting a release leaks. Only the returned
     * Mat survives the `finally` block — the caller takes ownership and is
     * responsible for releasing it (see `Mat.release()` note in the camera
     * master doc, Section 9, item 4 — the easiest place to introduce a leak
     * when porting is repeated retakes each producing an unreleased Mat).
     *
     * @param filePath Absolute path of the source image on disk.
     * @return A 256×256 [CvType.CV_8UC3] BGR [Mat], or `null` if decoding or
     *         processing fails. Errors are logged on failure.
     */
    fun scaleImageMat(filePath: String): Mat? {
        val startTimeMs = System.currentTimeMillis()

        // All intermediate Mats accumulate here and are released together in `finally`.
        val cleanup = mutableListOf<Mat>()

        // Tracked separately because on success this is the return value (and
        // therefore is NOT released in `finally`); on failure we explicitly release it.
        var result: Mat? = null

        return try {
            // 1. Decode the source image. OpenCV's `imread` returns an empty Mat
            //    (not null) when the file can't be decoded — check `empty()` explicitly.
            val original = Imgcodecs.imread(filePath).also(cleanup::add)
            if (original.empty()) {
                throw IOException("Failed to decode image file: $filePath")
            }
            require(original.channels() == 3) {
                "Input image must have exactly 3 channels (BGR), found ${original.channels()}"
            }

            // 2. Resize to the expected input dimensions using bicubic interpolation.
            val resized = resizeToModelInput(original).also(cleanup::add)

            // 3. Promote to 32-bit float so the per-channel multiplication below
            //    does not overflow or quantize values.
            val asFloat = Mat().also(cleanup::add)
            resized.convertTo(asFloat, CvType.CV_32FC3)

            // 4. Normalize each B, G, R channel so its mean equals TARGET_CHANNEL_MEAN.
            val normalized = normalizeChannelMeans(asFloat, cleanup).also(cleanup::add)

            // 5. Clip pixels back into the valid 0–255 range. Step 4 can push
            //    bright pixels above 255 (or, in pathological cases, below 0).
            val clipped = clipToPixelRange(normalized).also(cleanup::add)

            // 6. Round every channel value to one decimal place to match the
            //    reference pipeline's precision.
            val rounded = roundEachChannelToOneDecimal(clipped, cleanup).also(cleanup::add)

            // 7. Convert back to the standard 8-bit unsigned BGR Mat (CV_8UC3)
            //    that the caller expects. This is the value we return.
            result = Mat()
            rounded.convertTo(result, CvType.CV_8UC3)

            lastScaleImageTime = System.currentTimeMillis() - startTimeMs
            result
        } catch (e: Exception) {
            Log.e(TAG, "Error scaling image at $filePath", e)
            result?.release()
            null
        } finally {
            cleanup.forEach { it.release() }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Pipeline steps — each returns a NEW Mat owned by the caller.
    // ─────────────────────────────────────────────────────────────────────

    /** Resizes [source] to [TARGET_WIDTH] × [TARGET_HEIGHT] using bicubic interpolation. */
    private fun resizeToModelInput(source: Mat): Mat {
        val resized = Mat()
        Imgproc.resize(
            source,
            resized,
            Size(TARGET_WIDTH, TARGET_HEIGHT),
            0.0,
            0.0,
            Imgproc.INTER_CUBIC,
        )
        return resized
    }

    /**
     * Per-channel mean normalization.
     *
     * Splits [floatMat] (must be CV_32FC3) into its B, G, R channels, then
     * multiplies each by `TARGET_CHANNEL_MEAN / channelMean` so the channel's
     * average pixel value becomes [TARGET_CHANNEL_MEAN]. A channel whose mean
     * is exactly 0 (fully black) is left untouched to avoid divide-by-zero.
     *
     * @param floatMat CV_32FC3 input. Individual channel Mats are mutated in
     *                 place to avoid extra allocations — safe because they are
     *                 also appended to [cleanup] and released after use.
     * @param cleanup  Receives every temporary Mat created here so the caller
     *                 can release them.
     * @return A newly-merged CV_32FC3 Mat containing the normalized channels.
     */
    private fun normalizeChannelMeans(floatMat: Mat, cleanup: MutableList<Mat>): Mat {
        // Split into individual B, G, R channels — `split` allocates one Mat per channel.
        val channels = mutableListOf<Mat>()
        Core.split(floatMat, channels)
        cleanup.addAll(channels)

        // Scale each channel so its mean lands on TARGET_CHANNEL_MEAN.
        channels.forEach { channel ->
            val mean = Core.mean(channel).`val`[0]
            val factor = if (mean != 0.0) TARGET_CHANNEL_MEAN / mean else 1.0

            // `Core.multiply` takes a Mat operand for element-wise scaling, so we
            // build a constant-filled Mat the same size / type as the channel.
            val scaleMat = Mat(channel.size(), channel.type(), Scalar(factor))
            cleanup.add(scaleMat)
            Core.multiply(channel, scaleMat, channel)
        }

        // Re-merge the scaled channels into a single 3-channel Mat.
        val merged = Mat()
        Core.merge(channels, merged)
        return merged
    }

    /**
     * Clips every pixel in [mat] into the range [[PIXEL_MIN], [PIXEL_MAX]].
     * Implemented as element-wise `max(mat, 0)` followed by `min(result, 255)`.
     */
    private fun clipToPixelRange(mat: Mat): Mat {
        val clipped = Mat()
        Core.max(mat, Scalar.all(PIXEL_MIN), clipped)   // lower bound: values < 0   → 0
        Core.min(clipped, Scalar.all(PIXEL_MAX), clipped) // upper bound: values > 255 → 255
        return clipped
    }

    /**
     * Splits [mat] into channels, rounds each channel to one decimal place via
     * [roundChannelsToOneDecimals], then merges the rounded channels back. Every
     * temporary Mat is appended to [cleanup] for later release.
     */
    private fun roundEachChannelToOneDecimal(mat: Mat, cleanup: MutableList<Mat>): Mat {
        val channels = mutableListOf<Mat>()
        Core.split(mat, channels)
        cleanup.addAll(channels)

        val rounded = roundChannelsToOneDecimals(channels)
        cleanup.addAll(rounded)

        val merged = Mat()
        Core.merge(rounded, merged)
        return merged
    }

    /**
     * Rounds each [Mat] in [channels] to one decimal place.
     *
     * Algorithm (per channel):
     *  1. Multiply by 10  — shifts the first decimal digit into the integer slot.
     *  2. Cast to CV_32S  — OpenCV's `convertTo` uses `saturate_cast`, which
     *                       rounds-to-nearest for float → int. This is the
     *                       actual rounding step.
     *  3. Cast back to CV_32F.
     *  4. Divide by 10    — shifts the decimal back where it came from.
     *
     * This mirrors the reference pipeline's rounding so that floating-point
     * drift between platforms does not shift scoring output.
     *
     * Caller owns the returned Mats and must release them.
     */
    fun roundChannelsToOneDecimals(channels: List<Mat>): List<Mat> =
        channels.map(::roundChannelToOneDecimal)

    /** Implementation of the round-to-one-decimal trick — see [roundChannelsToOneDecimals]. */
    private fun roundChannelToOneDecimal(channel: Mat): Mat {
        // Work in CV_32F. If the input is already CV_32F, use it directly to avoid
        // an extra allocation; otherwise convert into a temp we release locally.
        val floatChannel: Mat
        val ownsFloatChannel: Boolean
        if (channel.type() == CvType.CV_32F) {
            floatChannel = channel
            ownsFloatChannel = false
        } else {
            floatChannel = Mat()
            channel.convertTo(floatChannel, CvType.CV_32F)
            ownsFloatChannel = true
        }

        val scaled = Mat()
        val asInt = Mat()
        val backToFloat = Mat()
        val rounded = Mat()
        try {
            Core.multiply(floatChannel, Scalar.all(ONE_DECIMAL_SHIFT), scaled)
            scaled.convertTo(asInt, CvType.CV_32S)        // round-to-nearest via saturate_cast
            asInt.convertTo(backToFloat, CvType.CV_32F)
            Core.divide(backToFloat, Scalar.all(ONE_DECIMAL_SHIFT), rounded)
        } finally {
            scaled.release()
            asInt.release()
            backToFloat.release()
            if (ownsFloatChannel) floatChannel.release()
        }
        return rounded
    }
}
