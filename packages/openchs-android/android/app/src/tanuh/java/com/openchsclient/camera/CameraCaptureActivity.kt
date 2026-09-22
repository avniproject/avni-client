package com.openchsclient.camera

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.AppCompatImageButton
import androidx.appcompat.widget.AppCompatImageView
import androidx.camera.core.CameraControl
import androidx.camera.core.CameraInfo
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalZeroShutterLag
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.core.TorchState
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.content.ContextCompat
import com.google.common.util.concurrent.ListenableFuture
import com.openchsclient.R
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * In-app camera capture screen — Phase 1 (camera UI parity) + Phase 2 (OpenCV image quality
 * scoring, added afterwards without changing any Phase 1 mechanics).
 *
 * Ported from fhir-app's (Aarogya Aarohan) `CameraxLauncherFragment.kt`, ~1:1 on the camera
 * mechanics (CameraX preview, framing grid, tap-to-focus, pinch/slider zoom, torch, retake,
 * zoomable review), with the following deliberate differences:
 *  - Plain `AppCompatActivity` instead of a Hilt-injected `DialogFragment` — avni-client has no
 *    Dagger Hilt DI, so this is a self-contained Activity with a clear Intent-based contract
 *    instead of RN-bridge wiring (that bridge is Phase 3, not this file).
 *  - Quality scoring (this file, Phase 2) ports fhir-app's `OpenCVUtils.scaleImageMat()` +
 *    `ImageQualityAnalyzer.analyze()` pipeline as-is (see those files), but changes what happens
 *    with the result: fhir-app sends it straight to PostHog, silently, never shown to the user
 *    (camera master doc, Section 2's "important nuance"). This port instead shows a dismissible
 *    **soft retake prompt** when the photo looks unusable (Section 8, decision #1) — a deliberate
 *    improvement over fhir-app, not strict parity — and hands the raw metrics back to JS
 *    (via [CameraModule]) for Firebase Analytics logging (Section 8, decision #2).
 *  - No PyTorch / lesion-classification ensemble — out of scope entirely (camera master doc,
 *    Section 2's reference-behavior table explicitly excludes it).
 *  - No fhirEngine / featureFlagUtil injection — fhir-app-specific, not present in avni-client.
 *
 * Contract: start with `startActivityForResult` (or an `ActivityResultContract`). On success,
 * `RESULT_OK` is returned with [EXTRA_RESULT_URI] set to the absolute path of the captured JPEG,
 * plus the `EXTRA_QUALITY_*` extras (see [putQualityExtras]) if quality scoring completed in
 * time. On cancel (user closes the screen or denies the camera permission), `RESULT_CANCELED` is
 * returned with no extra.
 */
class CameraCaptureActivity : AppCompatActivity() {

    private lateinit var cameraProviderFuture: ListenableFuture<ProcessCameraProvider>
    private lateinit var cameraExecutor: ExecutorService

    private lateinit var previewView: PreviewView
    private lateinit var flashButton: AppCompatImageButton
    private lateinit var closeCameraIB: AppCompatImageView
    private lateinit var captureButton: AppCompatImageView
    private lateinit var zoomIv: AppCompatImageView

    private lateinit var cameraPreviewViewLay: FrameLayout
    private lateinit var previewViewImageLay: ConstraintLayout
    private lateinit var retakeButton: LinearLayout
    private lateinit var zoomIndicatorll: LinearLayout
    private lateinit var selectButton: LinearLayout
    private lateinit var cameraControlsll: LinearLayout
    private lateinit var previewImage: ZoomableImageView
    private lateinit var zoomSeekBar: CustomSeekBar

    private lateinit var scaleGestureDetector: ScaleGestureDetector
    private lateinit var cameraControl: CameraControl
    private lateinit var cameraInfo: CameraInfo

    private var fileAbsPath: String = ""
    private var isCapturing = false

    /**
     * Result of the most recent [analyzeImageQuality] call for the current [fileAbsPath] — keyed
     * per [ImageQualityAnalyzer]'s `KEY_*` constants. Null until analysis completes (it runs
     * asynchronously right after capture) or if it failed/was skipped. Reset to null on retake.
     */
    private var qualityResult: Map<String, Any>? = null

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            startCamera()
        } else {
            Toast.makeText(this, getString(R.string.camera_permissions_denied), Toast.LENGTH_SHORT).show()
            setResult(RESULT_CANCELED)
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN)
        setContentView(R.layout.activity_camera_capture)

        previewView = findViewById(R.id.previewView)
        flashButton = findViewById(R.id.flashButton)
        closeCameraIB = findViewById(R.id.closeCameraIB)
        captureButton = findViewById(R.id.captureButton)
        zoomIv = findViewById(R.id.zoomIv)

        cameraPreviewViewLay = findViewById(R.id.camera_preview_fl)
        previewViewImageLay = findViewById(R.id.photo_preview_cl)
        retakeButton = findViewById(R.id.retake_ll)
        zoomIndicatorll = findViewById(R.id.zoomIndicatorll)
        selectButton = findViewById(R.id.done_ll)
        cameraControlsll = findViewById(R.id.cameraControlsll)
        previewImage = findViewById(R.id.previewImage)
        zoomSeekBar = findViewById(R.id.zoomSeekBar)

        selectButton.setOnClickListener {
            val result = Intent().putExtra(EXTRA_RESULT_URI, fileAbsPath)
            putQualityExtras(result)
            setResult(RESULT_OK, result)
            if (::cameraExecutor.isInitialized) cameraExecutor.shutdown()
            finish()
        }

        closeCameraIB.setOnClickListener {
            if (::cameraExecutor.isInitialized) cameraExecutor.shutdown()
            setResult(RESULT_CANCELED)
            finish()
        }

        zoomIv.setOnClickListener {
            zoomIndicatorll.visibility = if (zoomIndicatorll.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }

        retakeButton.setOnClickListener {
            val flashOffDrawable = getDrawable(R.drawable.camera_flash_off)
            flashButton.setImageDrawable(flashOffDrawable)
            isCapturing = false
            captureButton.isEnabled = true
            checkPermissionAndStartCamera()
            previewViewImageLay.visibility = View.GONE
            cameraPreviewViewLay.visibility = View.VISIBLE
            cameraControlsll.visibility = View.VISIBLE
            fileAbsPath = ""
            qualityResult = null
        }

        scaleGestureDetector = ScaleGestureDetector(this, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                val zoomRatio = cameraInfo.zoomState.value?.zoomRatio ?: 1f
                val scaleFactor = detector.scaleFactor
                cameraControl.setZoomRatio(zoomRatio * scaleFactor)
                return true
            }
        })

        previewView.setOnTouchListener { _, event ->
            scaleGestureDetector.onTouchEvent(event)
            return@setOnTouchListener true
        }

        checkPermissionAndStartCamera()
    }

    private fun setZoomLevel(zoomRatio: Float) {
        cameraControl.setLinearZoom(zoomRatio) // 0.0f represents 1x zoom level
    }

    private fun setupZoomControl() {
        val maxZoomRatio = cameraInfo.zoomState.value?.maxZoomRatio ?: 1f
        val minZoomRatio = cameraInfo.zoomState.value?.minZoomRatio ?: 1f
        zoomSeekBar.max = ((maxZoomRatio - minZoomRatio) * 10).toInt()
        zoomSeekBar.progress = ((cameraInfo.zoomState.value?.zoomRatio ?: minZoomRatio - minZoomRatio) * 10).toInt()

        zoomSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                val zoomRatio = minZoomRatio + (progress / 10f)
                cameraControl.setZoomRatio(zoomRatio)
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
    }

    private fun checkPermissionAndStartCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun setupTapToFocus() {
        previewView.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                val factory = previewView.meteringPointFactory
                val point = factory.createPoint(event.x, event.y)
                val action = FocusMeteringAction.Builder(point, FocusMeteringAction.FLAG_AF)
                    .setAutoCancelDuration(5, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                cameraControl.startFocusAndMetering(action)
            }
            true
        }
    }

    @OptIn(ExperimentalZeroShutterLag::class)
    private fun startCamera() {
        cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraExecutor = Executors.newSingleThreadExecutor()

        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()
            val resolution = android.util.Size(4096, 4096)

            val preview = Preview.Builder()
                .setTargetResolution(resolution)
                .build()
                .also { it.setSurfaceProvider(previewView.surfaceProvider) }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
            val imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .setTargetResolution(resolution)
                .build()

            try {
                cameraProvider.unbindAll()
                val camera = cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)

                cameraControl = camera.cameraControl
                cameraInfo = camera.cameraInfo
                cameraControl.enableTorch(true)
                flashButton.setImageDrawable(getDrawable(R.drawable.camera_flash_on))
                setZoomLevel(0.0f)
                setupZoomControl()
                setupTapToFocus()

                flashButton.setOnClickListener {
                    val torchIsOff = cameraInfo.torchState.value == TorchState.OFF
                    flashButton.setImageDrawable(
                        getDrawable(if (torchIsOff) R.drawable.camera_flash_on else R.drawable.camera_flash_off)
                    )
                    cameraControl.enableTorch(torchIsOff)
                }

                captureButton.setOnClickListener { takePhoto(imageCapture) }
            } catch (e: Exception) {
                Log.e(TAG, "Use case binding failed: ${e.message}", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun takePhoto(imageCapture: ImageCapture) {
        if (isCapturing) return
        isCapturing = true
        captureButton.isEnabled = false
        try {
            val file = File.createTempFile("IMG_", ".jpeg", filesDir)
            val outputOptions = ImageCapture.OutputFileOptions.Builder(file).build()

            imageCapture.takePicture(
                outputOptions, cameraExecutor, object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                        runOnUiThread {
                            if (::cameraControl.isInitialized) cameraControl.enableTorch(false)
                            try {
                                if (::cameraProviderFuture.isInitialized) cameraProviderFuture.get().unbindAll()
                            } catch (e: Exception) {
                                Log.e(TAG, "Error unbinding camera", e)
                            }
                            cameraPreviewViewLay.visibility = View.GONE
                            cameraControlsll.visibility = View.GONE
                            previewViewImageLay.visibility = View.VISIBLE
                            previewImage.setImageBitmap(decodeSampledBitmapFromFile(file, 1080, 1080))
                            fileAbsPath = file.absolutePath
                            flashButton.setImageDrawable(getDrawable(R.drawable.camera_flash_off))
                        }
                        // Phase 2 — quality scoring runs off the UI thread, on the same executor
                        // that just handled this capture callback. cameraExecutor is only shut
                        // down once this finishes (rather than immediately, as Phase 1 did),
                        // since it's needed to run the analysis itself. If the user backs out of
                        // the screen before this completes, qualityResult simply stays null —
                        // putQualityExtras() below already treats that as "unknown, not usable".
                        cameraExecutor.execute {
                            qualityResult = analyzeImageQuality(file.absolutePath)
                            runOnUiThread {
                                maybeShowQualityWarning()
                                if (::cameraExecutor.isInitialized) cameraExecutor.shutdown()
                            }
                        }
                    }

                    override fun onError(exception: ImageCaptureException) {
                        isCapturing = false
                        runOnUiThread { captureButton.isEnabled = true }
                        Log.e(TAG, "capture failed: ${exception.message}", exception)
                    }
                }
            )
        } catch (e: Exception) {
            isCapturing = false
            captureButton.isEnabled = true
            Log.e(TAG, "takePhoto failed", e)
        }
    }

    /**
     * Runs OpenCV-based blur/brightness/contrast/noise scoring on the just-captured photo
     * (Phase 2 — see [OpenCVUtils] and [ImageQualityAnalyzer], both ported from fhir-app).
     * Returns null (rather than throwing) on any failure — decoding or scoring should never
     * block the user from proceeding with a photo they already accepted.
     */
    private fun analyzeImageQuality(filePath: String): Map<String, Any>? {
        val mat = OpenCVUtils.scaleImageMat(filePath)
        if (mat == null) {
            Log.w(TAG, "analyzeImageQuality: OpenCVUtils.scaleImageMat returned null, skipping quality scoring")
            return null
        }
        return try {
            ImageQualityAnalyzer.analyze(mat)
        } catch (e: Exception) {
            Log.e(TAG, "analyzeImageQuality: ImageQualityAnalyzer.analyze failed", e)
            null
        } finally {
            mat.release()
        }
    }

    /**
     * Soft retake prompt (camera master doc, Section 8 decision #1) — a dismissible warning, NOT
     * a hard block, shown only when [qualityResult] flags the photo as unusable per
     * [ImageQualityAnalyzer]'s thresholds (currently uncalibrated placeholders copied from
     * fhir-app's clinical-photo tuning — see that file's class doc; treat this prompt as
     * directional until avni field-photo calibration happens).
     *
     * "Retake" re-enters the capture flow by simulating the existing retake button's own click
     * listener, rather than duplicating its logic. "Use anyway" just dismisses the dialog —
     * the photo the user already saw in the review screen is left exactly as-is.
     */
    private fun maybeShowQualityWarning() {
        val isUnusable = qualityResult?.get(ImageQualityAnalyzer.KEY_IS_UNUSABLE) as? Boolean ?: false
        if (!isUnusable || isFinishing || isDestroyed) return

        AlertDialog.Builder(this)
            .setMessage(R.string.camera_quality_warning_message)
            .setCancelable(true)
            .setPositiveButton(R.string.camera_retake) { dialog, _ ->
                dialog.dismiss()
                retakeButton.performClick()
            }
            .setNegativeButton(R.string.camera_quality_use_anyway) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    /**
     * Packs [qualityResult] (if analysis completed in time — see the race-condition note on
     * [takePhoto]'s cameraExecutor.execute block) into individual typed Intent extras, so
     * [CameraModule] can read them back without any custom Parcelable/serialization machinery.
     * No-ops (leaves [intent] with none of the EXTRA_QUALITY_* keys set) if scoring never
     * completed — [CameraModule] treats a missing [EXTRA_QUALITY_IS_UNUSABLE] as "quality
     * unknown", not as "usable".
     */
    private fun putQualityExtras(intent: Intent) {
        val quality = qualityResult ?: return
        (quality[ImageQualityAnalyzer.KEY_BLUR_VARIANCE] as? Double)?.let { intent.putExtra(EXTRA_QUALITY_BLUR_VARIANCE, it) }
        (quality[ImageQualityAnalyzer.KEY_BRIGHTNESS_MEAN] as? Double)?.let { intent.putExtra(EXTRA_QUALITY_BRIGHTNESS_MEAN, it) }
        (quality[ImageQualityAnalyzer.KEY_CONTRAST_STDDEV] as? Double)?.let { intent.putExtra(EXTRA_QUALITY_CONTRAST_STDDEV, it) }
        (quality[ImageQualityAnalyzer.KEY_NOISE_ESTIMATE] as? Double)?.let { intent.putExtra(EXTRA_QUALITY_NOISE_ESTIMATE, it) }
        (quality[ImageQualityAnalyzer.KEY_IS_UNUSABLE] as? Boolean)?.let { intent.putExtra(EXTRA_QUALITY_IS_UNUSABLE, it) }
        (quality[ImageQualityAnalyzer.KEY_IMAGE_WIDTH] as? Int)?.let { intent.putExtra(EXTRA_QUALITY_IMAGE_WIDTH, it) }
        (quality[ImageQualityAnalyzer.KEY_IMAGE_HEIGHT] as? Int)?.let { intent.putExtra(EXTRA_QUALITY_IMAGE_HEIGHT, it) }
    }

    /**
     * Decodes [file] into a [Bitmap] downsampled to roughly fit [reqWidth]x[reqHeight], to avoid
     * OOM when loading a ~4096x4096 capture just for the review screen. The full-resolution JPEG
     * on disk is untouched — [fileAbsPath] (returned via [EXTRA_RESULT_URI]) still points at it.
     */
    private fun decodeSampledBitmapFromFile(file: File, reqWidth: Int, reqHeight: Int): Bitmap? {
        return try {
            val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, boundsOptions)

            var inSampleSize = 1
            val (height, width) = boundsOptions.outHeight to boundsOptions.outWidth
            if (height > reqHeight || width > reqWidth) {
                val halfHeight = height / 2
                val halfWidth = width / 2
                while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                    inSampleSize *= 2
                }
            }

            val decodeOptions = BitmapFactory.Options().apply { this.inSampleSize = inSampleSize }
            BitmapFactory.decodeFile(file.absolutePath, decodeOptions)
        } catch (e: Exception) {
            Log.e(TAG, "Error decoding captured photo", e)
            null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::cameraExecutor.isInitialized) cameraExecutor.shutdown()
    }

    companion object {
        private const val TAG = "CameraCaptureActivity"

        /** Intent extra key for the result: absolute file path of the captured JPEG. */
        const val EXTRA_RESULT_URI = "com.openchsclient.camera.RESULT_URI"

        // Phase 2 — quality-scoring result extras (see putQualityExtras / ImageQualityAnalyzer's
        // KEY_* constants for the underlying values). Only present if scoring completed before
        // the user tapped "Done".
        const val EXTRA_QUALITY_BLUR_VARIANCE = "com.openchsclient.camera.QUALITY_BLUR_VARIANCE"
        const val EXTRA_QUALITY_BRIGHTNESS_MEAN = "com.openchsclient.camera.QUALITY_BRIGHTNESS_MEAN"
        const val EXTRA_QUALITY_CONTRAST_STDDEV = "com.openchsclient.camera.QUALITY_CONTRAST_STDDEV"
        const val EXTRA_QUALITY_NOISE_ESTIMATE = "com.openchsclient.camera.QUALITY_NOISE_ESTIMATE"
        const val EXTRA_QUALITY_IS_UNUSABLE = "com.openchsclient.camera.QUALITY_IS_UNUSABLE"
        const val EXTRA_QUALITY_IMAGE_WIDTH = "com.openchsclient.camera.QUALITY_IMAGE_WIDTH"
        const val EXTRA_QUALITY_IMAGE_HEIGHT = "com.openchsclient.camera.QUALITY_IMAGE_HEIGHT"
    }
}
