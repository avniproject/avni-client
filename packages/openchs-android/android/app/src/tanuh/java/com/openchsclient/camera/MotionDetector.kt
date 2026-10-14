package com.openchsclient.camera

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import kotlin.math.sqrt

/**
 * Detects whether the device was physically rotating while a photo was being captured, using the
 * gyroscope — added 2026-09-30 as a direct complement to [ImageQualityAnalyzer]'s pixel-based
 * blur check, after real-world testing showed a photo taken while moving the camera was not
 * flagged by the retake warning.
 *
 * ### Why a sensor check, not a better pixel-based blur metric
 *
 * [ImageQualityAnalyzer]'s blur check (Laplacian variance) is well-suited to out-of-focus blur,
 * where sharpness is lost roughly evenly in every direction. Motion blur is directional: if the
 * camera moved along one axis during the exposure, edges running parallel to that axis can stay
 * largely sharp while only edges crossing it get smeared — so a whole-image variance average can
 * still read as "sharp enough" even though the photo is visibly blurred from motion. Rather than
 * trying to infer motion after the fact from pixels (which this specific metric cannot reliably
 * do), this measures directly whether the device was moving during capture.
 *
 * ### Threshold is a starting point, not calibrated against real avni field photos either
 *
 * [ROTATION_THRESHOLD_RAD_PER_SEC] is a conservative, commonly-used "the phone was clearly being
 * moved" cutoff (~0.5 rad/s, ~29 degrees/sec) — same caveat as [ImageQualityAnalyzer]'s own
 * placeholder thresholds: treat a `wasMoving` result as directional until validated against real
 * usage, not as an authoritative pass/fail line.
 *
 * ### Fails safe
 *
 * If the device has no gyroscope, [start] simply never records any motion and every
 * [captureResult] reports `wasMoving = false` — this can only ADD detections on devices that
 * have the sensor, never remove or change the existing blur/brightness checks, and never blocks
 * capture (same dismissible "Retake / Use anyway" prompt as before).
 *
 * ### Threading
 *
 * [SensorManager.registerListener] is called with no explicit [android.os.Handler], so
 * [onSensorChanged] callbacks land on the thread that called [start] — this class is only ever
 * driven from [CameraCaptureActivity], which calls [start]/[stop] and reads [captureResult] all
 * on the main thread, so the internal sample buffer never needs its own locking.
 */
class MotionDetector(context: Context) {

    private val sensorManager = context.applicationContext
        .getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    private val gyroscope = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

    // Rolling buffer of recent (elapsedRealtimeNanos, angularVelocityMagnitudeRadPerSec) samples,
    // trimmed to the last BUFFER_WINDOW_MS on every new sample so it never grows unbounded.
    private val samples = ArrayDeque<Pair<Long, Float>>()

    private val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            val magnitude = sqrt(
                event.values[0] * event.values[0] +
                    event.values[1] * event.values[1] +
                    event.values[2] * event.values[2]
            )
            val now = SystemClock.elapsedRealtimeNanos()
            samples.addLast(now to magnitude)
            val cutoff = now - BUFFER_WINDOW_MS * 1_000_000L
            while (samples.isNotEmpty() && samples.first().first < cutoff) {
                samples.removeFirst()
            }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }

    /** True if this device actually has a gyroscope to read from. */
    val isAvailable: Boolean get() = gyroscope != null

    /** Starts buffering gyroscope samples. No-op (and [isAvailable] is false) if there's no gyroscope. */
    fun start() {
        val sensor = gyroscope ?: return
        sensorManager?.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_GAME)
    }

    /** Stops buffering and clears the sample window. Safe to call even if [start] was never called. */
    fun stop() {
        sensorManager?.unregisterListener(listener)
        samples.clear()
    }

    /**
     * Looks at gyroscope samples covering the last [lookbackMs] milliseconds (default:
     * [BUFFER_WINDOW_MS], chosen to comfortably cover typical shutter lag plus exposure) and
     * reports the highest angular-velocity magnitude seen in that window, and whether it crossed
     * [ROTATION_THRESHOLD_RAD_PER_SEC].
     *
     * Call this right when a capture completes (see [CameraCaptureActivity]'s onImageSaved
     * callback) — on the main thread, same as [start]/[stop].
     */
    fun captureResult(lookbackMs: Long = BUFFER_WINDOW_MS): MotionResult {
        val cutoff = SystemClock.elapsedRealtimeNanos() - lookbackMs * 1_000_000L
        val maxMagnitude = samples.asSequence()
            .filter { it.first >= cutoff }
            .maxOfOrNull { it.second } ?: 0f
        return MotionResult(
            wasMoving = maxMagnitude > ROTATION_THRESHOLD_RAD_PER_SEC,
            maxAngularVelocityRadPerSec = maxMagnitude,
        )
    }

    data class MotionResult(val wasMoving: Boolean, val maxAngularVelocityRadPerSec: Float)

    companion object {
        // TODO(camera-motion-detection): starting-point threshold, not calibrated against real
        // avni field photos — see class doc.
        private const val ROTATION_THRESHOLD_RAD_PER_SEC = 0.5f

        // Covers typical shutter lag + exposure time with margin; see captureResult()'s doc.
        private const val BUFFER_WINDOW_MS = 700L
    }
}
