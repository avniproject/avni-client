package com.openchsclient

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface

/**
 * Image-file → upright `Bitmap`, shared by `EdgeModelModule.runInferenceOnImage` and the QC
 * benchmark instrumented test (src/androidTest/…/QcBenchmarkInstrumentedTest.kt) so both go
 * through exactly the same decode path.
 */
object ImageDecoding {

    /** Decode the file (ARGB_8888, full resolution) and apply its EXIF orientation. */
    fun decodeUpright(imagePath: String): Bitmap {
        val decoded = BitmapFactory.decodeFile(imagePath)
            ?: throw IllegalArgumentException("Cannot decode image at '$imagePath'. Check the path and file format.")
        return applyExifOrientation(decoded, imagePath)
    }

    /**
     * Apply the JPEG EXIF orientation tag to the decoded bitmap (all 8 cases), matching the
     * reference pipeline (cv2.imread auto-applies; the TANUH PoC's rotateBitmapIfNeeded).
     * BitmapFactory does NOT apply it, so a portrait field photo would otherwise reach the
     * models rotated and the (non-rotation-invariant) models could flip a verdict. Returns the
     * original bitmap when the tag is NORMAL/undefined; recycles the source only when a new
     * bitmap is produced.
     */
    fun applyExifOrientation(src: Bitmap, imagePath: String): Bitmap {
        val orientation = try {
            ExifInterface(imagePath).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        } catch (e: Exception) { ExifInterface.ORIENTATION_NORMAL }
        val m = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> m.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> m.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> m.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> m.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> m.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> { m.postRotate(90f); m.postScale(-1f, 1f) }
            ExifInterface.ORIENTATION_TRANSVERSE -> { m.postRotate(270f); m.postScale(-1f, 1f) }
            else -> return src   // NORMAL / UNDEFINED — nothing to do
        }
        val rotated = Bitmap.createBitmap(src, 0, 0, src.width, src.height, m, true)
        if (rotated != src) src.recycle()
        return rotated
    }
}
