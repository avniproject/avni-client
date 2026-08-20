package com.openchsclient.camera

import android.app.Activity
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * JS-facing bridge for the native camera screen (Phase 3 of the camera-usability feature — see
 * the master plan doc). TANUH-ONLY: this file lives in src/tanuh/, alongside
 * CameraCaptureActivity/CameraPackage, so it (and the CameraX/ConstraintLayout/Guava/OpenCV
 * dependencies it indirectly requires) is never compiled into any other partner flavour.
 *
 * JS-facing API (via NativeModules.CameraModule):
 *   launchCamera(): Promise<{uri: string, quality: object | null} | null>
 *     Resolves with `null` if the user cancelled (closed the screen or denied the camera
 *     permission) — mirroring react-native-image-picker's launchCamera() callback shape of
 *     `{didCancel: true}` vs `{assets: [...]}`, just as a resolved value instead of a callback.
 *     Otherwise resolves with `{uri, quality}`:
 *       - `uri`: absolute file path of the captured JPEG.
 *       - `quality`: Phase 2 image-quality scoring result (blurVariance, brightnessMean,
 *         contrastStdDev, noiseEstimate, isUnusable, imageWidth, imageHeight — see
 *         ImageQualityAnalyzer.kt's KEY_* constants for the source of these field names), or
 *         `null` if scoring didn't complete (OpenCV decode failure, or the user tapped Done
 *         before the async analysis in CameraCaptureActivity finished). Callers must treat a
 *         null `quality` as "unknown", not as "usable" — see MediaV2FormElement.js/
 *         MediaFormElement.js for how this is logged to Firebase Analytics.
 *     Rejects only for genuine failures (no current Activity, or a capture already in flight).
 *
 * MediaV2FormElement.js checks `NativeModules.CameraModule` for existence (undefined on every
 * non-tanuh flavour, since this whole file is absent from their compiled output) and an
 * OrganisationConfigService server flag before calling this instead of
 * react-native-image-picker's launchCamera() — see OrganisationConfigService.isNativeCameraEnabled().
 */
class CameraModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val TAG = "CameraModule"
        // Arbitrary, just needs to not collide with another startActivityForResult request code
        // in MainActivity/other native modules active at the same time.
        private const val REQUEST_CAMERA_CAPTURE = 27391
    }

    private var pendingPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "CameraModule"

    @ReactMethod
    fun launchCamera(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity available to launch the camera screen")
            return
        }
        if (pendingPromise != null) {
            promise.reject("CAMERA_ALREADY_ACTIVE", "A camera capture is already in progress")
            return
        }
        pendingPromise = promise
        try {
            val intent = Intent(activity, CameraCaptureActivity::class.java)
            activity.startActivityForResult(intent, REQUEST_CAMERA_CAPTURE)
        } catch (e: Exception) {
            Log.e(TAG, "launchCamera: failed to start CameraCaptureActivity", e)
            pendingPromise = null
            promise.reject("CAMERA_LAUNCH_FAILED", "Failed to launch the camera screen: ${e.message}", e)
        }
    }

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_CAMERA_CAPTURE) return
        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode == Activity.RESULT_OK) {
            val filePath = data?.getStringExtra(CameraCaptureActivity.EXTRA_RESULT_URI)
            if (filePath.isNullOrEmpty()) {
                promise.reject("CAMERA_NO_RESULT", "Camera screen returned success but no file path")
            } else {
                promise.resolve(buildResultMap(filePath, data))
            }
        } else {
            // User closed the screen or denied the camera permission — resolve(null), matching
            // react-native-image-picker's didCancel behaviour rather than treating it as an error.
            promise.resolve(null)
        }
    }

    /**
     * Builds the JS-facing result object: `{ uri, quality: {...} | null }`. `quality` mirrors
     * ImageQualityAnalyzer's result keys (see CameraCaptureActivity.putQualityExtras for how
     * these extras are populated on the Activity side) — null if scoring didn't complete.
     */
    private fun buildResultMap(filePath: String, data: Intent): WritableMap {
        val result = Arguments.createMap()
        result.putString("uri", filePath)

        if (!data.hasExtra(CameraCaptureActivity.EXTRA_QUALITY_IS_UNUSABLE)) {
            result.putNull("quality")
            return result
        }

        val quality = Arguments.createMap()
        quality.putDouble("blurVariance", data.getDoubleExtra(CameraCaptureActivity.EXTRA_QUALITY_BLUR_VARIANCE, 0.0))
        quality.putDouble("brightnessMean", data.getDoubleExtra(CameraCaptureActivity.EXTRA_QUALITY_BRIGHTNESS_MEAN, 0.0))
        quality.putDouble("contrastStdDev", data.getDoubleExtra(CameraCaptureActivity.EXTRA_QUALITY_CONTRAST_STDDEV, 0.0))
        quality.putDouble("noiseEstimate", data.getDoubleExtra(CameraCaptureActivity.EXTRA_QUALITY_NOISE_ESTIMATE, 0.0))
        quality.putBoolean("isUnusable", data.getBooleanExtra(CameraCaptureActivity.EXTRA_QUALITY_IS_UNUSABLE, false))
        quality.putInt("imageWidth", data.getIntExtra(CameraCaptureActivity.EXTRA_QUALITY_IMAGE_WIDTH, 0))
        quality.putInt("imageHeight", data.getIntExtra(CameraCaptureActivity.EXTRA_QUALITY_IMAGE_HEIGHT, 0))
        result.putMap("quality", quality)
        return result
    }

    override fun onNewIntent(intent: Intent?) {
        // No-op — CameraCaptureActivity is a standalone Activity (standard launch mode),
        // not singleTask/singleInstance, so it never re-enters via onNewIntent.
    }
}
