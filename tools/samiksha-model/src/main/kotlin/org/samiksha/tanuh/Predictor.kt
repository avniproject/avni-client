package org.samiksha.tanuh

import com.facebook.react.bridge.ReadableMap
import com.openchsclient.EdgeModelModule
import java.io.File
import org.json.JSONObject

/**
 * Reads one image with each fold through the app's `EdgeModelModule`, then combines the folds.
 *
 * The module reads an image from a file, so the bytes go to a temporary file in `tempDir`, which is
 * deleted when the image has been read. `keys` are the folds' keys in order and `params` is the
 * `output.params` of the override.
 */
class Predictor(private val module: EdgeModelModule, private val keys: List<String>, private val params: JSONObject, private val tempDir: File) {
    /** The verdict for the bytes of an image file; `Verdict.Failed("unreadable_image")` when Android's decoder cannot read them. */
    fun predict(image: ByteArray): Verdict {
        val file = File.createTempFile("image", ".bin", tempDir)
        try {
            file.writeBytes(image)
            val outcomes = keys.map { runFold(it, file) }
            val unreadable = outcomes.any { it is FoldOutcome.Failed && it.message.contains(UNREADABLE) }
            return if (unreadable) Verdict.Failed("unreadable_image") else combine(outcomes, params)
        } finally {
            file.delete()
        }
    }

    private fun runFold(key: String, file: File): FoldOutcome {
        val promise = RecordingPromise()
        module.runInferenceOnImage(key, file.absolutePath, promise)
        return try {
            val answer = promise.await() as ReadableMap
            FoldOutcome.Ok(mapOf(
                "label" to answer.getString("label"),
                "confidence" to answer.getDouble("confidence"),
                "logit" to answer.getDouble("logit"),
            ))
        } catch (e: PromiseRejected) {
            FoldOutcome.Failed(e.message ?: "")
        }
    }

    private companion object {
        const val UNREADABLE = "Cannot decode image"  // the app's message when BitmapFactory returns nothing
    }
}
