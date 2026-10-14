package com.openchsclient.camera

import android.os.Build
import kotlin.math.pow
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfDouble
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

/**
 * Blur / brightness / contrast / noise quality scoring for a captured photo.
 *
 * Ported from fhir-app's `org.smartregister.fhircore.quest.util.ImageQualityAnalyzer`
 * (camera usability enhancement, Phase 2). Scoring math is unchanged from the
 * reference implementation — only the result shape differs, because this port
 * plugs into a different telemetry sink:
 *
 *  - fhir-app returns `PostHogAnalytics.Props`-keyed values and sends them
 *    straight to PostHog, purely for analytics — the score is never shown to
 *    the user or used to gate anything (see camera master doc, Section 2's
 *    "important nuance" and Section 8, decision #1).
 *  - avni-client already depends on `@react-native-firebase/analytics`
 *    (decision #2), and the team decided on a **soft retake prompt** rather
 *    than fhir-app's silent-telemetry-only behavior (decision #1) — a
 *    deliberate improvement, not strict parity. So [analyze]'s result here
 *    needs to (a) cross the RN bridge as plain string keys any JS caller can
 *    read directly (native Map -> RN WritableMap -> plain JS object), and
 *    (b) be usable by `CameraCaptureActivity` to decide whether to show the
 *    dismissible "Photo may be blurry or too dark — Retake / Use anyway"
 *    warning. The JS side is then free to log the same fields to Firebase
 *    Analytics.
 *
 * ### Thresholds are a placeholder, not calibrated for avni-client yet
 *
 * [MIN_BLUR_VARIANCE], [MIN_BRIGHTNESS], and [MAX_BRIGHTNESS] are copied
 * as-is from fhir-app, where they were tuned for close-up oral-lesion photos
 * taken under controlled clinical lighting. avni's field photos (general
 * form attachments, arbitrary subjects, arbitrary lighting) were never part
 * of that tuning set. Per the camera master doc (Section 4, Section 8
 * decision #1, Section 9 item 2) this is an explicitly required calibration
 * gate before the retake prompt ships to real users — not an optional
 * refinement. Until that calibration pass happens against a real batch of
 * avni field photos, treat [isUnusable] as directional, not authoritative:
 * a badly-tuned prompt firing on good photos is worse than no prompt at all.
 *
 * ### 2026-09-29 fix: measurement was being taken on the wrong Mat
 *
 * [analyze] must be called on [OpenCVUtils.scaleImageMatForQuality]'s output, NOT
 * [OpenCVUtils.scaleImageMat]'s — the latter's brightness-normalization step rescales every
 * image's mean pixel value toward 128 before this class ever sees it, which was silently
 * defeating the brightness check (and skewing blur variance) for genuinely too-dark/too-bright
 * photos — the likely cause of the warning "missing bad photos sometimes". See
 * [OpenCVUtils.scaleImageMatForQuality]'s doc for the full explanation. This fix corrects
 * *what* is measured; the threshold *values* above are unchanged and still need the real-photo
 * calibration pass described above.
 */
object ImageQualityAnalyzer {

    // TODO(camera-phase2-calibration): placeholder thresholds copied from fhir-app's
    // clinical-lesion-photo tuning — recalibrate against real avni field photos before
    // this gates any user-facing retake prompt. See class doc above.
    private const val MIN_BLUR_VARIANCE = 100.0
    private const val MIN_BRIGHTNESS = 40.0
    private const val MAX_BRIGHTNESS = 220.0

    // Result map keys — plain strings so they read naturally as JS object keys once this
    // Map crosses the RN bridge (native Map -> WritableMap -> JS object property names).
    const val KEY_BLUR_VARIANCE = "blurVariance"
    const val KEY_BRIGHTNESS_MEAN = "brightnessMean"
    const val KEY_CONTRAST_STDDEV = "contrastStdDev"
    const val KEY_NOISE_ESTIMATE = "noiseEstimate"
    const val KEY_IS_UNUSABLE = "isUnusable"
    const val KEY_DEVICE_MODEL = "deviceModel"
    const val KEY_DEVICE_MANUFACTURER = "deviceManufacturer"
    const val KEY_OS_VERSION = "osVersion"
    const val KEY_IMAGE_WIDTH = "imageWidth"
    const val KEY_IMAGE_HEIGHT = "imageHeight"

    // Source (pre-resize) decoded dimensions — added 2026-09-29 alongside the measurement-order
    // fix above, so blur-variance-vs-device-resolution correlation can actually be checked in the
    // Firebase data (KEY_IMAGE_WIDTH/HEIGHT above are always TARGET_WIDTH/HEIGHT, the scoring
    // size, not the original capture size).
    const val KEY_SOURCE_IMAGE_WIDTH = "sourceImageWidth"
    const val KEY_SOURCE_IMAGE_HEIGHT = "sourceImageHeight"

    // Gyroscope-based motion detection (2026-09-30) — see MotionDetector.kt's class doc for why
    // this exists alongside (not instead of) the pixel-based blur check above.
    const val KEY_MOTION_DETECTED = "motionDetected"
    const val KEY_MAX_ANGULAR_VELOCITY = "maxAngularVelocityRadPerSec"

    /**
     * Scores [mat] (expected: the output of [OpenCVUtils.scaleImageMatForQuality] — NOT
     * [OpenCVUtils.scaleImageMat], see this class's doc comment) for blur, brightness, contrast,
     * and noise, and flags whether it looks unusable per the (placeholder) thresholds.
     *
     * [sourceWidth]/[sourceHeight] are the ORIGINAL (pre-resize) decoded dimensions — logged
     * alongside the score, not used in the [KEY_IS_UNUSABLE] decision, purely so device-specific
     * resolution differences can be correlated against blur-variance readings later.
     *
     * [motionDetected] (from [MotionDetector.captureResult]) DOES feed into [KEY_IS_UNUSABLE] —
     * added 2026-09-30 because the Laplacian blur check above misses directional motion blur (see
     * MotionDetector.kt's class doc). [maxAngularVelocityRadPerSec] is logged alongside it purely
     * for visibility into how far over/under the threshold each capture was.
     *
     * Every intermediate Mat/MatOfDouble is released in `finally` — [mat] itself is the
     * caller's responsibility (mirrors [OpenCVUtils.scaleImageMatForQuality]'s ownership
     * contract).
     */
    fun analyze(
        mat: Mat,
        sourceWidth: Int = mat.width(),
        sourceHeight: Int = mat.height(),
        motionDetected: Boolean = false,
        maxAngularVelocityRadPerSec: Float? = null,
    ): Map<String, Any> {
        val gray = Mat()
        val laplacian = Mat()
        val blurred = Mat()
        val residual = Mat()
        val mean = MatOfDouble()
        val stdDev = MatOfDouble()
        val laplacianMean = MatOfDouble()
        val laplacianStdDev = MatOfDouble()
        val residualMean = MatOfDouble()
        val residualStdDev = MatOfDouble()

        try {
            if (mat.channels() > 1) {
                Imgproc.cvtColor(mat, gray, Imgproc.COLOR_BGR2GRAY)
            } else {
                mat.copyTo(gray)
            }

            Core.meanStdDev(gray, mean, stdDev)
            Imgproc.Laplacian(gray, laplacian, CvType.CV_64F)
            Core.meanStdDev(laplacian, laplacianMean, laplacianStdDev)

            Imgproc.GaussianBlur(gray, blurred, Size(3.0, 3.0), 0.0)
            Core.absdiff(gray, blurred, residual)
            Core.meanStdDev(residual, residualMean, residualStdDev)

            val brightness = mean.first()
            val blurVariance = laplacianStdDev.first().pow(2.0)
            val isUnusable =
                blurVariance < MIN_BLUR_VARIANCE ||
                    brightness < MIN_BRIGHTNESS ||
                    brightness > MAX_BRIGHTNESS ||
                    motionDetected

            return mapOf(
                KEY_BLUR_VARIANCE to blurVariance,
                KEY_BRIGHTNESS_MEAN to brightness,
                KEY_CONTRAST_STDDEV to stdDev.first(),
                KEY_NOISE_ESTIMATE to residualStdDev.first(),
                KEY_IS_UNUSABLE to isUnusable,
                KEY_DEVICE_MODEL to Build.MODEL.orEmpty(),
                KEY_DEVICE_MANUFACTURER to Build.MANUFACTURER.orEmpty(),
                KEY_OS_VERSION to Build.VERSION.SDK_INT,
                KEY_IMAGE_WIDTH to mat.width(),
                KEY_IMAGE_HEIGHT to mat.height(),
                KEY_SOURCE_IMAGE_WIDTH to sourceWidth,
                KEY_SOURCE_IMAGE_HEIGHT to sourceHeight,
                KEY_MOTION_DETECTED to motionDetected,
                KEY_MAX_ANGULAR_VELOCITY to (maxAngularVelocityRadPerSec?.toDouble() ?: 0.0),
            )
        } finally {
            gray.release()
            laplacian.release()
            blurred.release()
            residual.release()
            mean.release()
            stdDev.release()
            laplacianMean.release()
            laplacianStdDev.release()
            residualMean.release()
            residualStdDev.release()
        }
    }

    private fun MatOfDouble.first(): Double = toArray().firstOrNull() ?: 0.0
}
