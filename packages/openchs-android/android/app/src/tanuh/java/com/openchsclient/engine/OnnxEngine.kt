package com.openchsclient.engine

import android.content.Context
import android.util.Log
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtLoggingLevel
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
 * ── Memory posture on low-RAM devices ───────────────────────────────────────────────
 * The 3-fold ensemble holds three sessions resident. With ORT's defaults each session spins
 * its *own* intra-op thread pool and its own CPU arena, so three sessions on a 4-core / 768 MB
 * device meant ~12 worker threads + three growing arenas — a memory/CPU spike that tripped
 * `onTrimMemory`, which then closed a session mid-`run` and crashed the native runtime. We
 * avoid that here:
 *   • One **shared global thread pool** on the environment (sessions use it via
 *     `disablePerSessionThreads`), so total threads stay constant regardless of fold count.
 *     Pool size = core count, so each (sequentially-run) fold still gets full parallelism —
 *     latency is unchanged, only the thread *explosion* is removed.
 *   • **CPU arena + memory-pattern disabled**, so a session doesn't retain a growing
 *     activation buffer between runs (lower steady-state resident memory; negligible latency
 *     cost for one-shot image inference).
 * The eviction-vs-run race itself is closed in `EdgeModelModule` (inference and `onTrimMemory`
 * are mutually exclusive); these options keep the trim from firing in the first place.
 *
 * `OrtSession.createSession(path)` reads the whole model into native memory at creation —
 * it does not retain the file — so `EdgeModelModule` is free to delete the decrypted temp
 * file as soon as `load` returns (same on-disk-plaintext window as the PyTorch path).
 */
class OnnxEngine(@Suppress("UNUSED_PARAMETER") private val context: Context) : InferenceEngine {

    companion object {
        private const val TAG = "OnnxEngine"

        /** Shared intra-op pool size — full core parallelism, but one pool for all sessions. */
        private val INTRA_OP_THREADS = Runtime.getRuntime().availableProcessors().coerceIn(1, 4)

        /** True when [ENV] was created with a global thread pool (so sessions can share it). */
        @Volatile private var sharedPool = false

        /**
         * Process-wide ORT environment. Created once with a global thread pool; if that fails
         * (e.g. an env was already initialised elsewhere), fall back to the plain singleton and
         * cap per-session threads instead.
         */
        private val ENV: OrtEnvironment by lazy {
            try {
                OrtEnvironment.ThreadingOptions().use { t ->
                    t.setGlobalIntraOpNumThreads(INTRA_OP_THREADS)
                    t.setGlobalInterOpNumThreads(1)
                    val env = OrtEnvironment.getEnvironment(
                        OrtLoggingLevel.ORT_LOGGING_LEVEL_WARNING, "tanuh-edge", t
                    )
                    sharedPool = true
                    Log.d(TAG, "ORT env with shared global pool (intraOp=$INTRA_OP_THREADS)")
                    env
                }
            } catch (e: Throwable) {
                Log.w(TAG, "global thread pool unavailable (${e.message}); per-session threads")
                OrtEnvironment.getEnvironment()
            }
        }
    }

    private fun newSessionOptions(): OrtSession.SessionOptions {
        val o = OrtSession.SessionOptions()
        // Don't retain a growing arena / pre-planned activation buffer between runs — lowers
        // steady-state resident memory for the 3 sessions held by the ensemble.
        o.setMemoryPatternOptimization(false)
        o.setCPUArenaAllocator(false)
        if (sharedPool) {
            o.disablePerSessionThreads()           // use ENV's shared global pool
        } else {
            o.setIntraOpNumThreads(INTRA_OP_THREADS)
            o.setInterOpNumThreads(1)
        }
        return o
    }

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
        val session = newSessionOptions().use { opts -> ENV.createSession(plaintextFile.absolutePath, opts) }
        // Single-input image models — bind by the model's declared input name rather than
        // assuming a fixed string, so re-exported models with a different name still load.
        val inputName = session.inputNames.first()
        return OnnxHandle(session, inputName)
    }

    override fun run(handle: InferenceEngine.Handle, input: ImagePreprocessor.Result): FloatArray =
        run(handle, input.data, input.shape)

    override fun run(handle: InferenceEngine.Handle, data: FloatArray, shape: LongArray): FloatArray {
        val h = handle as OnnxHandle
        val tensor = OnnxTensor.createTensor(ENV, FloatBuffer.wrap(data), shape)
        try {
            val t0 = System.nanoTime()
            h.session.run(Collections.singletonMap(h.inputName, tensor)).use { result ->
                val out = result.get(0) as OnnxTensor
                val fb = out.floatBuffer
                    ?: throw IllegalStateException("ONNX output for '${h.inputName}' is not a float tensor")
                val arr = FloatArray(fb.remaining()).also { fb.get(it) }
                Log.d(TAG, "run: ${(System.nanoTime() - t0) / 1_000_000}ms, out=${arr.size}")
                return arr
            }
        } finally {
            tensor.close()
        }
    }
}
