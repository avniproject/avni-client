package org.samiksha.tanuh

import android.graphics.BitmapFactory
import com.facebook.react.bridge.ReadableMap
import com.openchsclient.EdgeModelModule
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Runs the app's own image, preprocessing, ONNX and decoder code on Robolectric with the dummy folds. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36], shadows = [ShadowArguments::class])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AppPipelineTest {
    private val staging = File(System.getProperty("dummy.staging")!!)
    private val images = File(staging, "images")
    private val overrideJson = File(System.getProperty("override.json")!!).readText()
    private lateinit var module: EdgeModelModule
    private lateinit var folds: Folds

    @Before
    fun loadFolds() {
        module = newEdgeModule()
        folds = Folds(module, staging, overrideJson)
        folds.load()
    }

    private fun foldAnswer(sha: String, image: String): ReadableMap {
        val promise = RecordingPromise()
        module.runInferenceOnImage(sha, File(images, image).absolutePath, promise)
        return promise.await() as ReadableMap
    }

    private fun confidences(image: String) = folds.keys.map { foldAnswer(it, image).getDouble("confidence") }

    @Test
    fun threeFoldsAreKnownInOrder() {
        assertEquals(3, folds.keys.size)
        assertEquals(3, folds.keys.toSet().size)
    }

    @Test
    fun decodesWithAndroidNativeDecoder() {
        val bitmap = BitmapFactory.decodeFile(File(images, "jpeg64.jpg").absolutePath)
        assertNotNull(bitmap)
        val pixels = IntArray(64 * 64).also { bitmap.getPixels(it, 0, 64, 0, 0, 64, 64) }
        val reference = File(images, "jpeg64.rgb").readBytes()
        var worst = 0
        pixels.forEachIndexed { i, argb ->
            val rgb = intArrayOf((argb shr 16) and 255, (argb shr 8) and 255, argb and 255)
            for (c in 0..2) worst = maxOf(worst, Math.abs(rgb[c] - (reference[i * 3 + c].toInt() and 255)))
        }
        assertTrue("worst difference from Pillow was $worst grey levels", worst <= 3)
        assertTrue("decoded pixels are blank", pixels.any { (it and 0xFFFFFF) != 0 })
    }

    @Test
    fun foldAnswerHasDecoderFields() {
        for (sha in folds.keys) {
            val answer = foldAnswer(sha, "pale.jpg")
            assertTrue(answer.getString("label") in setOf("Negative", "Positive"))
            assertTrue(answer.getDouble("confidence") in 0.0..1.0)
            assertTrue(answer.getDouble("logit").isFinite())
            assertEquals(0.5, answer.getDouble("threshold"), 1e-9)
        }
    }

    @Test
    fun exifRotatedMatchesUpright() {
        for (sha in folds.keys) {
            val rotated = foldAnswer(sha, "rotated6.jpg").getDouble("confidence")
            val upright = foldAnswer(sha, "upright.jpg").getDouble("confidence")
            assertEquals(upright, rotated, 1e-3)
        }
    }

    @Test
    fun pngWithAlphaAndGreyscaleAnswered() {
        for (name in listOf("alpha.png", "grey.jpg")) {
            for (sha in folds.keys) assertTrue(foldAnswer(sha, name).getDouble("confidence") in 0.0..1.0)
        }
    }

    @Test
    fun garbageIsRejected() {
        val promise = RecordingPromise()
        module.runInferenceOnImage(folds.keys[0], File(images, "garbage.jpg").absolutePath, promise)
        val failure = runCatching { promise.await() }.exceptionOrNull()
        assertTrue(failure is PromiseRejected)
        assertTrue(failure!!.message!!.contains("Cannot decode image"))
    }

    @Test
    fun paleDiscRaisesScore() {
        val plain = confidences("plain.jpg")
        val pale = confidences("pale.jpg")
        for (i in 0..2) assertTrue(pale[i] > plain[i])
        assertTrue("plain image should be negative for every fold", plain.all { it < 0.5 })
        assertTrue("pale image should be positive for every fold", pale.all { it > 0.5 })
    }

    @Test
    fun foldsDisagreeOnSomeImages() {
        val split = (0 until 20).count { i ->
            val c = confidences("sweep%02d.jpg".format(i))
            c.any { it > 0.5 } && c.any { it <= 0.5 }
        }
        assertTrue("no sweep image split the folds", split >= 1)
        assertFalse(split == 20)
    }

    @Test
    fun tamperedBlobIsRejected() {
        val copy = createTempDir("tampered")
        staging.copyRecursively(copy)
        val blob = copy.listFiles()!!.first { it.name.endsWith(".bin") }
        blob.writeBytes(blob.readBytes().also { it[20] = (it[20].toInt() xor 1).toByte() })
        val failure = runCatching { Folds(newEdgeModule(), copy, overrideJson).load() }.exceptionOrNull()
        assertTrue(failure is PromiseRejected)
        copy.deleteRecursively()
    }
}
