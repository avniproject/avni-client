package com.openchsclient

import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.openchsclient.decoding.SigmoidBinaryDecoder
import com.openchsclient.engine.OnnxEngine
import com.openchsclient.preprocessing.Preprocessors
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.io.FileOutputStream

/**
 * On-device QC benchmark: runs every benchmark image through the app's REAL inference path —
 * BitmapFactory decode + EXIF (ImageDecoding), the override's preprocessor (Preprocessors), and
 * ONNX Runtime Mobile (OnnxEngine) — and writes per-model scores so they can be compared with
 * TANUH_QC/benchmarking_model_scores_127Images.xlsx.
 *
 * Driven by tools/edge-model/qc-parity/run_device_benchmark.sh, which pushes this layout into the
 * app's external files dir and pulls results back:
 *
 *   <externalFilesDir>/qc-bench/
 *     override.json                     the ensemble override (tools/edge-model/tanuh-ensemble-override.json)
 *     models/<name>.onnx                plaintext ONNX folds, e.g. model6.onnx model8.onnx model82.onnx
 *     images/<label>/<id>.jpg           label = Suspicious | Non-Suspicious
 *   → results.csv                       image_id,label,model,logit,probability,app_positive
 *                                       (app_positive = SigmoidBinaryDecoder.isPositive with the override's params)
 *   → tensors/<id>.u8                   (dumpTensors=true) preprocessed tensor ×255 as raw bytes, CHW
 *
 * Not part of CI (needs the models and images on the device); run it explicitly.
 */
@RunWith(AndroidJUnit4::class)
class QcBenchmarkInstrumentedTest {

    /**
     * Step 1 of run_device_benchmark.sh: let the APP create <externalFilesDir>/qc-bench before adb
     * pushes into it. On Android 11+ a directory created by adb (shell uid) under Android/data/<pkg>
     * is not readable by the app, so the app must own the directory first.
     */
    @Test
    fun prepareQcBenchDir() {
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        val ext = ctx.getExternalFilesDir(null)
        assertTrue("app external files dir unavailable", ext != null)
        val root = File(ext, "qc-bench")
        root.deleteRecursively()
        assertTrue("cannot clear ${root.absolutePath} (left over from an earlier adb push?) — " +
            "run: adb shell rm -rf ${root.absolutePath}", !root.exists())
        for (d in listOf(File(root, "images"), File(root, "models"))) {
            assertTrue("cannot create ${d.absolutePath} (parent ${ext!!.absolutePath}: exists=${ext.exists()} " +
                "canWrite=${ext.canWrite()})", d.mkdirs() || d.isDirectory)
        }
        Log.i(TAG, "prepared ${root.absolutePath}")
    }

    @Test
    fun runQcBenchmark() {
        val instr = InstrumentationRegistry.getInstrumentation()
        val ctx = instr.targetContext
        val args = InstrumentationRegistry.getArguments()
        val dumpTensors = args.getString("dumpTensors", "true").toBoolean()

        val root = File(ctx.getExternalFilesDir(null), "qc-bench")
        val overrideFile = File(root, "override.json")
        assertTrue("missing ${overrideFile.absolutePath} — run run_device_benchmark.sh", overrideFile.isFile)
        val contract = ModelContract.parse(overrideFile.readText())
        val preprocessor = Preprocessors.resolve(contract.preprocessorName)
        assertTrue("harness expects decoder 'sigmoid-binary', override has '${contract.decoderName}'",
            contract.decoderName == "sigmoid-binary")

        val engine = OnnxEngine(ctx)
        val models = (File(root, "models").listFiles { f -> f.name.endsWith(".onnx") } ?: emptyArray())
            .sortedBy { it.name }
            .map { it.nameWithoutExtension to engine.load(it.nameWithoutExtension, it) }
        assertTrue("no models in ${root}/models", models.isNotEmpty())

        val images = (File(root, "images").listFiles { f -> f.isDirectory } ?: emptyArray()).sortedBy { it.name }
            .flatMap { dir ->
                (dir.listFiles { f -> f.extension.lowercase() in setOf("jpg", "jpeg", "png", "bmp", "tif", "tiff") } ?: emptyArray())
                    .sortedBy { it.name }.map { dir.name to it }
            }
        assertTrue("no images in ${root}/images/<label>/", images.isNotEmpty())

        val tensorDir = File(root, "tensors").apply { if (dumpTensors) mkdirs() }
        val out = File(root, "results.csv")
        val partial = File(root, "results.csv.partial")
        partial.bufferedWriter().use { w ->
            w.write("image_id,label,model,logit,probability,app_positive\n")
            for ((idx, entry) in images.withIndex()) {
                val (label, file) = entry
                val bmp = ImageDecoding.decodeUpright(file.absolutePath)
                val input = try { preprocessor.preprocess(bmp, contract.preprocessorParams) } finally { bmp.recycle() }
                if (dumpTensors) {
                    val bytes = ByteArray(input.data.size) { i -> Math.round(input.data[i] * 255f).coerceIn(0, 255).toByte() }
                    FileOutputStream(File(tensorDir, "${file.nameWithoutExtension}.u8")).use { it.write(bytes) }
                }
                for ((name, handle) in models) {
                    val logit = engine.run(handle, input)[0]
                    val prob = SigmoidBinaryDecoder.probability(logit)
                    val positive = SigmoidBinaryDecoder.isPositive(logit, contract.decoderParams)
                    w.write("${file.nameWithoutExtension},$label,$name,$logit,$prob,${if (positive) 1 else 0}\n")
                }
                Log.i(TAG, "[${idx + 1}/${images.size}] ${file.name} done")
            }
        }
        partial.renameTo(out)
        models.forEach { it.second.close() }
        Log.i(TAG, "wrote ${out.absolutePath}")
    }

    companion object { private const val TAG = "QcBenchmark" }
}
