package com.openchsclient.engine

import android.content.Context
import android.util.Log
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import com.openchsclient.preprocessing.ImagePreprocessor
import java.io.File
import java.nio.FloatBuffer
import java.util.Collections

/**
 * ONNX Runtime Mobile inference backend (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Uses Microsoft's `com.microsoft.onnxruntime:onnxruntime-android`. Unlike PyTorch Mobile
 * 1.13.1 (whose prebuilt `.so` LOAD segments are 4 KB-aligned and rejected by Google Play
 * for targetSdk 35), ONNX Runtime's 64-bit native libs are already 16 KB-page-aligned, so
 * the tanuh AAB clears the Play 16 KB check without a custom rebuild. The MViT2 fold
 * ensemble is shipped as ONNX exports of the clinically-validated TorchScript models.
 *
 * `OrtSession.createSession(path)` reads the whole model into native memory at creation —
 * it does not retain the file — so `EdgeModelModule` is free to delete the decrypted temp
 * file as soon as `load` returns (same on-disk-plaintext window as the PyTorch path).
 */
class OnnxEngine(@Suppress("UNUSED_PARAMETER") private val context: Context) : InferenceEngine {

    companion object { private const val TAG = "OnnxEngine" }

    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()

    private class OnnxHandle(val session: OrtSession, val inputName: String) : InferenceEngine.Handle {
        @Volatile private var closed = false
        override fun close() {
            if (closed) return
            closed = true
            try { session.close() } catch (e: Exception) { Log.w(TAG, "session.close: ${e.message}") }
        }
    }

    override fun load(modelKey: String, plaintextFile: File): InferenceEngine.Handle {
        Log.d(TAG, "load($modelKey): plaintext=${plaintextFile.length()} bytes at ${plaintextFile.absolutePath}")
        val session = env.createSession(plaintextFile.absolutePath, OrtSession.SessionOptions())
        // Single-input image models — bind by the model's declared input name rather than
        // assuming a fixed string, so re-exported models with a different name still load.
        val inputName = session.inputNames.first()
        return OnnxHandle(session, inputName)
    }

    override fun run(handle: InferenceEngine.Handle, input: ImagePreprocessor.Result): FloatArray =
        run(handle, input.data, input.shape)

    override fun run(handle: InferenceEngine.Handle, data: FloatArray, shape: LongArray): FloatArray {
        val h = handle as OnnxHandle
        val tensor = OnnxTensor.createTensor(env, FloatBuffer.wrap(data), shape)
        try {
            h.session.run(Collections.singletonMap(h.inputName, tensor)).use { result ->
                val out = result.get(0) as OnnxTensor
                val fb = out.floatBuffer
                    ?: throw IllegalStateException("ONNX output for '${h.inputName}' is not a float tensor")
                return FloatArray(fb.remaining()).also { fb.get(it) }
            }
        } finally {
            tensor.close()
        }
    }
}
