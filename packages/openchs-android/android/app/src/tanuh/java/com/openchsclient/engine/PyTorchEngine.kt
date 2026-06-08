package com.openchsclient.engine

import android.content.Context
import android.util.Log
import com.openchsclient.preprocessing.ImagePreprocessor
import org.pytorch.IValue
import org.pytorch.Module
import org.pytorch.Tensor
import java.io.File

/**
 * PyTorch Mobile inference backend (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Uses LibTorch's Java bindings (`org.pytorch:pytorch_android:1.13.1`). This version is
 * pinned exactly to the TANUH PoC at `~/IdeaProjects/aiapp` because clinical accuracy was
 * validated against this exact runtime — upgrading would force re-validation.
 *
 * ── Decrypt-then-load tradeoff ─────────────────────────────────────────────────────
 * `org.pytorch.Module.load` requires a **file path**, not a buffer. `EdgeModelModule`
 * streams the AES-decrypt directly into `filesDir/<modelKey>.pt.tmp` (mode 0600 via
 * Android's `MODE_PRIVATE`) and passes us the path. We call `Module.load(path)` — which
 * mmaps the file into LibTorch's native heap — and return the handle. The bridge deletes
 * the temp file immediately after we return.
 *
 * Plaintext exists on disk for the duration of decrypt + Module.load + delete (low single-
 * digit seconds for an 18 MB model). This is the same posture documented in
 * `tools/edge-model/README.md`: the AES key ships in the APK, so encryption is obfuscation
 * rather than full IP protection. A determined reverser bypasses the on-device window
 * entirely by extracting the key from the APK and decrypting the blob offline.
 *
 * Future hardening: a custom JNI shim that calls `torch::jit::load(istream)` directly would
 * keep plaintext entirely off-disk. ~1-2 days of native work, deferred until needed.
 */
class PyTorchEngine(@Suppress("UNUSED_PARAMETER") private val context: Context) : InferenceEngine {

    companion object { private const val TAG = "PyTorchEngine" }

    private class PyTorchHandle(val module: Module) : InferenceEngine.Handle {
        @Volatile private var closed = false
        override fun close() {
            if (closed) return
            closed = true
            try { module.destroy() } catch (e: Exception) { Log.w(TAG, "Module.destroy: ${e.message}") }
        }
    }

    override fun load(modelKey: String, plaintextFile: File): InferenceEngine.Handle {
        Log.d(TAG, "load($modelKey): plaintext=${plaintextFile.length()} bytes at ${plaintextFile.absolutePath}")
        val module = Module.load(plaintextFile.absolutePath)
        return PyTorchHandle(module)
    }

    override fun run(handle: InferenceEngine.Handle, input: ImagePreprocessor.Result): FloatArray =
        run(handle, input.data, input.shape)

    override fun run(handle: InferenceEngine.Handle, data: FloatArray, shape: LongArray): FloatArray {
        val module = (handle as PyTorchHandle).module
        val tensor = Tensor.fromBlob(data, shape)
        val output = module.forward(IValue.from(tensor)).toTensor()
        return output.dataAsFloatArray
    }
}
