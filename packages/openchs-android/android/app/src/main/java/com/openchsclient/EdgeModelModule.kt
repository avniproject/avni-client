package com.openchsclient

import android.content.ComponentCallbacks2
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.util.Base64
import android.util.Log
import androidx.annotation.VisibleForTesting
import com.facebook.react.bridge.*
import com.openchsclient.decoding.Decoders
import com.openchsclient.engine.InferenceEngine
import com.openchsclient.preprocessing.Preprocessors
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.channels.FileChannel
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Generic on-device inference bridge for the Avni client.
 *
 * ── Design ─────────────────────────────────────────────────────────────────────────
 * The bridge is **engine-agnostic** and **model-agnostic**:
 *   • Per-model semantics — which engine, which preprocessor, which decoder — come from the
 *     synced DownloadableContent row's payload as a small declarative DSL. It owns no
 *     model-specific math and does not branch on `modelKey`.
 *   • Engine = `ai.onnxruntime.OrtSession` etc., dispatched via `InferenceEngine` (Kotlin
 *     interface). ONNX Runtime Mobile is the default engine, shipped in every flavour; adding
 *     TFLite/ExecuTorch is one new class drop, not a rewrite.
 *   • Preprocessor + decoder = named Kotlin classes registered in `Preprocessors.REGISTRY`
 *     and `Decoders.REGISTRY`. Override JSON references them by string name; the bridge
 *     dispatches via lookup. Adding a new pipeline = drop a new class, register by name.
 *
 * Models load **lazily on first inference** for a given key. Once loaded the runtime stays
 * for the app's lifetime, *until* the OS asks for memory back via
 * `onTrimMemory(TRIM_MEMORY_RUNNING_LOW)` or worse, at which point we close all engines and
 * free their off-heap buffers. Subsequent inferences self-heal: the load-args cache lets us
 * rebuild without round-tripping to JS.
 *
 * Encrypted models are stream-decrypted directly into a private temp file at
 * `filesDir/<modelKey>.model.tmp` (MODE_PRIVATE, 0600) — 64 KB chunk peak on the JVM heap.
 * The engine reads the file (`OrtEnvironment.createSession(path)` for ONNX) and the bridge
 * deletes the file in a `finally` block; plaintext exists on disk for the duration of decrypt + load
 * (single-digit seconds for a ~18 MB model). The AES key arrives as a call argument, delivered
 * out-of-band from the server key endpoint.
 *
 * The module registers `ComponentCallbacks2` to receive memory-pressure signals.
 * Backgrounding the app for a camera intent or phone call does *not* trigger eviction unless
 * the OS reports actual pressure — the common case (form → camera → return → run inference)
 * keeps the runtime warm.
 *
 * ── JS-facing API (via NativeModules.EdgeModelModule) ─────────────────────────────
 *   loadEncryptedModelFromFile(modelKey, encryptedFilePath, base64Key, sha256, overrideJson): Promise<boolean>
 *   runInference(modelKey, inputData: number[], shape?: number[]): Promise<object>
 *   runInferenceOnImage(modelKey, imagePath): Promise<object>
 *
 * `runInference*` returns the decoder's structured map — typically
 *   { label: string, confidence: number, raw: number[] }.
 */
class EdgeModelModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ComponentCallbacks2 {

    companion object {
        private const val TAG = "EdgeModelModule"
        private const val GCM_TAG_BITS = 128                  // AES-GCM authentication-tag size
        private const val GCM_IV_BYTES = 12                   // 96-bit IV — recommended for GCM
        private const val DECRYPT_CHUNK_BYTES = 64 * 1024     // 64 KB chunks: balance syscalls vs Java-heap pressure

        @JvmStatic
        @VisibleForTesting
        internal fun decryptFileToFile(src: File, key: ByteArray, expectedSha256Hex: String, outFile: File) {
            if (!src.exists() || !src.isFile || !src.canRead()) {
                throw java.io.FileNotFoundException(
                    "Encrypted model blob missing or unreadable at '${src.absolutePath}'."
                )
            }
            // Reject a sub-IV blob cleanly; otherwise it BufferUnderflows opaquely reading the IV.
            if (src.length() < GCM_IV_BYTES) {
                throw IllegalArgumentException(
                    "Encrypted model blob at '${src.absolutePath}' is truncated: ${src.length()} bytes, need at least $GCM_IV_BYTES for the IV."
                )
            }
            FileInputStream(src).use { fis ->
                decryptChannelToFile(fis.channel, 0L, src.length(), key, expectedSha256Hex, outFile)
            }
        }

        @JvmStatic
        @VisibleForTesting
        internal fun decryptChannelToFile(
            channel: FileChannel,
            startOffset: Long,
            totalLen: Long,
            key: ByteArray,
            expectedSha256Hex: String,
            outFile: File
        ) {
            val ciphertextLen = totalLen - GCM_IV_BYTES

            // Chunked-read rather than mmap: a MappedByteBuffer survives channel.close() until GC, pinning the cached blob and deferring a later delete.
            channel.position(startOffset)
            val readBuf = ByteBuffer.allocate(DECRYPT_CHUNK_BYTES)

            val iv = readFully(channel, readBuf, GCM_IV_BYTES)

            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(GCM_TAG_BITS, iv))

            val md = MessageDigest.getInstance("SHA-256")
            val chunk = ByteArray(DECRYPT_CHUNK_BYTES)
            val outChunk = ByteArray(DECRYPT_CHUNK_BYTES + 32)

            try {
                FileOutputStream(outFile).use { fos ->
                    val outCh = fos.channel
                    var remaining = ciphertextLen.toInt()
                    while (remaining > 0) {
                        val n = minOf(remaining, DECRYPT_CHUNK_BYTES)
                        readChunk(channel, readBuf, chunk, n)
                        val produced = cipher.update(chunk, 0, n, outChunk)
                        if (produced > 0) {
                            outCh.write(ByteBuffer.wrap(outChunk, 0, produced))
                            md.update(outChunk, 0, produced)
                        }
                        remaining -= n
                    }
                    // doFinal verifies the GCM tag — throws AEADBadTagException on tamper or wrong key.
                    val tail = cipher.doFinal()
                    if (tail.isNotEmpty()) {
                        outCh.write(ByteBuffer.wrap(tail))
                        md.update(tail)
                    }
                }

                // Plaintext SHA check — catches a swapped blob re-encrypted with the same key (valid GCM auth).
                val actual = md.digest().joinToString("") { "%02x".format(it) }
                if (!actual.equals(expectedSha256Hex, ignoreCase = true)) {
                    throw SecurityException("Decrypted plaintext SHA-256 mismatch (expected=$expectedSha256Hex, actual=$actual)")
                }
            } finally {
                chunk.fill(0); outChunk.fill(0); key.fill(0)
            }
        }

        private fun readFully(channel: FileChannel, readBuf: ByteBuffer, n: Int): ByteArray {
            val out = ByteArray(n)
            readChunk(channel, readBuf, out, n)
            return out
        }

        private fun readChunk(channel: FileChannel, readBuf: ByteBuffer, dst: ByteArray, n: Int) {
            var read = 0
            while (read < n) {
                readBuf.clear()
                readBuf.limit(minOf(readBuf.capacity(), n - read))
                val r = channel.read(readBuf)
                if (r <= 0) throw java.io.IOException("Unexpected end of ciphertext: read $read of $n bytes")
                readBuf.flip()
                readBuf.get(dst, read, r)
                read += r
            }
        }
    }

    /**
     * Engine providers, one per supported `engine` name in the payload override, resolved
     * lazily and reflectively. OnnxEngine ships in every flavour; reflective lookup means a
     * flavour still boots even if an engine class is absent, and the engine is only realised
     * when an org has a configured model that requests it.
     */
    private val engineProviders: Map<String, () -> InferenceEngine> by lazy {
        buildMap { registerEngine("onnx", "com.openchsclient.engine.OnnxEngine") }
    }

    /** Realised engines, built on first request and cached. */
    private val engines = HashMap<String, InferenceEngine>()

    private fun MutableMap<String, () -> InferenceEngine>.registerEngine(name: String, fqcn: String) {
        try {
            val ctor = Class.forName(fqcn).getConstructor(android.content.Context::class.java)
            put(name) { ctor.newInstance(reactApplicationContext.applicationContext) as InferenceEngine }
        } catch (e: ClassNotFoundException) {
            Log.d(TAG, "Engine '$name' ($fqcn) not bundled in this flavour; skipping")
        } catch (e: Throwable) {
            Log.w(TAG, "Engine '$name' ($fqcn) failed to register: ${e.message}")
        }
    }

    /** Resolve-and-cache the realised engine for `engineName`, building it on first request. */
    private fun engineFor(engineName: String): InferenceEngine =
        engines.getOrPut(engineName) {
            (engineProviders[engineName] ?: throw IllegalArgumentException(
                "Unknown or unavailable engine '$engineName'. Available: ${engineProviders.keys}."
            )).invoke()
        }

    /** Live engine handles. Cleared on memory-pressure eviction. */
    private val handles = HashMap<String, InferenceEngine.Handle>()

    /** Resolved per-model contract (engine + preprocessor + decoder). Cleared on eviction. */
    private val contracts = HashMap<String, ModelContract>()

    /**
     * Cached load arguments — survives memory-pressure eviction so we can self-heal a
     * subsequent inference call without bouncing back to JS for the encryption key etc.
     * The AES key persists in native memory between eviction and reload; this matches the
     * existing security posture (the key was already in native memory while the model was loaded).
     */
    private val loadArgs = HashMap<String, LoadArgs>()

    /**
     * Serialises model load/inference against memory-pressure eviction. ONNX Runtime aborts
     * (destroyed-mutex SIGABRT / null-deref SIGSEGV) if a session is closed while a `run` is
     * in flight — and `onTrimMemory` runs on the main thread while inference runs on the
     * native-modules thread. Inference and loading hold this lock; `onTrimMemory` `tryLock`s
     * and simply defers eviction when inference is in progress (never blocks the main thread).
     */
    private val inferenceLock = ReentrantLock()

    private sealed class LoadArgs {
        abstract val overrideJson: String?
        data class EncryptedFile(
            val encryptedFilePath: String,
            val base64Key: String,
            val sha256Hex: String,
            override val overrideJson: String?
        ) : LoadArgs()
    }

    init {
        // Subscribe to OS memory-pressure callbacks. Application context (not activity) so we
        // get signals even while the activity is paused (e.g. behind the camera intent).
        reactContext.applicationContext.registerComponentCallbacks(this)
    }

    override fun getName(): String = "EdgeModelModule"

    // ── React-callable methods ─────────────────────────────────────────────────────────

    @ReactMethod
    fun loadEncryptedModelFromFile(
        modelKey: String,
        encryptedFilePath: String,
        base64Key: String,
        sha256Hex: String,
        overrideJson: String?,
        promise: Promise
    ) {
        inferenceLock.lock()
        try {
            loadArgs[modelKey] = LoadArgs.EncryptedFile(encryptedFilePath, base64Key, sha256Hex, overrideJson)
            ensureLoaded(modelKey)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadEncryptedModelFromFile($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_LOAD_ERROR", "Failed to load encrypted model '$modelKey' from file: ${e.message}", e)
        } finally {
            inferenceLock.unlock()
        }
    }

    /**
     * Run inference on a caller-supplied flat `FloatArray`. `shape` is optional; if absent the
     * engine treats the array as a single-batch 1-D vector (`[1, N]`). The output is the
     * configured decoder's structured map.
     */
    @ReactMethod
    fun runInference(modelKey: String, inputData: ReadableArray, shape: ReadableArray?, promise: Promise) {
        inferenceLock.lock()
        try {
            ensureLoaded(modelKey)
            val handle = handles[modelKey]!!
            val contract = contracts[modelKey]!!
            val engine = engineFor(contract.engine)

            val data = FloatArray(inputData.size()) { i -> inputData.getDouble(i).toFloat() }
            val shapeArr = if (shape != null) {
                LongArray(shape.size()) { i -> shape.getInt(i).toLong() }
            } else {
                longArrayOf(1L, data.size.toLong())
            }
            val output = engine.run(handle, data, shapeArr)
            val outputShape = longArrayOf(output.size.toLong())
            promise.resolve(Decoders.resolve(contract.decoderName).decode(output, outputShape, contract.decoderParams))
        } catch (e: Exception) {
            Log.e(TAG, "runInference($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_INFERENCE_ERROR", "Inference failed: ${e.message}", e)
        } finally {
            inferenceLock.unlock()
        }
    }

    /**
     * Apply the JPEG EXIF orientation tag to the decoded bitmap (all 8 cases), matching the
     * reference pipeline (cv2.imread auto-applies; the TANUH PoC's rotateBitmapIfNeeded).
     * BitmapFactory does NOT apply it, so a portrait field photo would otherwise reach the
     * models rotated and the (non-rotation-invariant) models could flip a verdict. Returns the
     * original bitmap when the tag is NORMAL/undefined; recycles the source only when a new
     * bitmap is produced.
     */
    private fun applyExifOrientation(src: Bitmap, imagePath: String): Bitmap {
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

    /**
     * Run inference directly on an image file. Image preprocessing (decode → resize →
     * normalise → layout transpose) is driven entirely by the resolved preprocessor plugin;
     * **no per-model math lives here**. Adding a new model with novel preprocessing is a
     * one-line change in JSON (or one new class in `Preprocessors.kt`).
     */
    @ReactMethod
    fun runInferenceOnImage(modelKey: String, imagePath: String, promise: Promise) {
        inferenceLock.lock()
        try {
            ensureLoaded(modelKey)
            val handle = handles[modelKey]!!
            val contract = contracts[modelKey]!!
            val engine = engineFor(contract.engine)

            val decoded = BitmapFactory.decodeFile(imagePath)
                ?: throw IllegalArgumentException("Cannot decode image at '$imagePath'. Check the path and file format.")
            // Apply EXIF orientation before preprocessing — matches cv2.imread / the reference PoC.
            val raw = applyExifOrientation(decoded, imagePath)
            // Bitmaps back pixel data in native heap; release eagerly so a session of camera-path
            // images doesn't pile up native memory and trigger onTrimMemory (which would evict
            // the model). The preprocessor never retains `raw` past return.
            try {
                if (BuildConfig.DEBUG) {
                    // Diagnostic — log decoded bitmap geometry + EXIF orientation. We now apply EXIF
                    // via applyExifOrientation above (matching cv2.imread / the reference PoC's
                    // rotateBitmapIfNeeded), so `raw` is already upright here; a non-NORMAL tag below
                    // reflects the ORIGINAL file, logged for parity debugging only.
                    val exif = try { ExifInterface(imagePath) } catch (e: Exception) { null }
                    val orientation = exif?.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_UNDEFINED)
                    Log.d(TAG, "decodeFile: w=${raw.width} h=${raw.height} config=${raw.config} exifOrientation=$orientation")
                }

                val preprocessor = Preprocessors.resolve(contract.preprocessorName)
                val preprocessed = preprocessor.preprocess(raw, contract.preprocessorParams)
                val output = engine.run(handle, preprocessed)
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "outputTensor: size=${output.size} first8=${output.take(8)}")
                }

                val decoder = Decoders.resolve(contract.decoderName)
                promise.resolve(decoder.decode(output, longArrayOf(output.size.toLong()), contract.decoderParams))
            } finally {
                raw.recycle()
            }
        } catch (e: Exception) {
            Log.e(TAG, "runInferenceOnImage($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_INFERENCE_ERROR", "Image inference failed: ${e.message}", e)
        } finally {
            inferenceLock.unlock()
        }
    }

    // ── Lifecycle hooks ────────────────────────────────────────────────────────────────

    /**
     * Memory-pressure callback. Closes all engine handles and clears their off-heap state
     * when the OS asks for memory back. We deliberately do *not* clear `loadArgs`, so the
     * next inference can self-heal-reload without involving JS.
     */
    override fun onTrimMemory(level: Int) {
        if (level < ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) return
        // Never close a session that a `run` is mid-flight on (would crash the native runtime).
        // tryLock keeps the main thread non-blocking; if inference holds the lock we defer —
        // a later trim, or the next inference completing, frees the memory.
        if (!inferenceLock.tryLock()) {
            Log.w(TAG, "onTrimMemory(level=$level) — inference in progress; deferring eviction")
            return
        }
        try {
            Log.w(TAG, "onTrimMemory(level=$level) — releasing ${handles.size} handle(s); load-args retained for self-heal reload")
            handles.values.forEach { it.close() }
            handles.clear()
            contracts.clear()
        } finally {
            inferenceLock.unlock()
        }
    }

    override fun onLowMemory() {
        // Older API — delegate to the same eviction path.
        onTrimMemory(ComponentCallbacks2.TRIM_MEMORY_COMPLETE)
    }

    override fun onConfigurationChanged(newConfig: Configuration) { /* no-op */ }

    override fun onCatalystInstanceDestroy() {
        // Wait briefly for any in-flight inference so we don't close a session mid-run, then
        // tear down regardless — the RN instance is going away.
        val locked = try { inferenceLock.tryLock(1, TimeUnit.SECONDS) } catch (e: InterruptedException) { false }
        try {
            Log.d(TAG, "onCatalystInstanceDestroy: closing ${handles.size} handle(s)")
            handles.values.forEach { it.close() }
            handles.clear()
            contracts.clear()
            loadArgs.clear()
            reactApplicationContext.applicationContext.unregisterComponentCallbacks(this)
        } finally {
            if (locked) inferenceLock.unlock()
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────────────

    /**
     * Build the engine handle for `modelKey` if it isn't already loaded. Self-healing:
     * after a memory-pressure eviction, the next inference call hits this path and rebuilds
     * from the cached `loadArgs` without re-prompting JS.
     *
     * Memory-budget rationale: previous design landed the plaintext in a 18 MB
     * `ByteBuffer.allocateDirect` (counted against the ART growth-limit on Android) before
     * handing it to the engine, which then wrote it to a temp file anyway. Camera bitmaps
     * + Realm + Hermes + that 18 MB peak overflowed the default ~96 MB heap. We now stream
     * decrypt-→-file in 64 KB chunks, then engine.load reads the file. Peak transient
     * Java-heap delta during load is ~16 KB.
     */
    private fun ensureLoaded(modelKey: String) {
        if (handles.containsKey(modelKey)) return
        val args = loadArgs[modelKey]
            ?: throw IllegalStateException(
                "Model not loaded: '$modelKey'. Call loadEncryptedModelFromFile() before inference."
            )
        val safeKey = modelKey.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val plaintextFile = File(reactApplicationContext.filesDir, "$safeKey.model.tmp")
        try {
            when (args) {
                is LoadArgs.EncryptedFile -> streamDecryptFileToFile(args.encryptedFilePath, args.base64Key, args.sha256Hex, plaintextFile)
            }
            // Defensive — `filesDir` already gives 0600 via MODE_PRIVATE, but older devices
            // don't always honour the default. Owner-only readable.
            try { plaintextFile.setReadable(false, false); plaintextFile.setReadable(true, true) } catch (_: Exception) {}

            buildHandle(modelKey, plaintextFile, args.overrideJson)
        } finally {
            // The plaintext file's on-disk window must not outlive load. Whether load
            // succeeded or threw, delete it before returning to the caller.
            if (plaintextFile.exists() && !plaintextFile.delete()) {
                Log.w(TAG, "ensureLoaded($modelKey): failed to delete temp file ${plaintextFile.absolutePath}")
            }
        }
    }

    private fun buildHandle(modelKey: String, plaintextFile: File, overrideJson: String?) {
        val contract = ModelContract.parse(overrideJson)
        val engine = engineFor(contract.engine)
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "buildHandle($modelKey): engine=${contract.engine}, preprocessor=${contract.preprocessorName}, decoder=${contract.decoderName}, plaintext=${plaintextFile.length()} bytes")
        }
        val handle = engine.load(modelKey, plaintextFile)
        handles[modelKey] = handle
        contracts[modelKey] = contract
    }

    // Blob layout (matches `tools/edge-model/encrypt-model.js`): [12-byte IV][ciphertext][16-byte GCM tag].
    private fun streamDecryptFileToFile(
        encryptedFilePath: String,
        base64Key: String,
        expectedSha256Hex: String,
        outFile: File
    ) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "streamDecryptFileToFile(path=$encryptedFilePath) → ${outFile.absolutePath}")
        }
        decryptFileToFile(File(encryptedFilePath), Base64.decode(base64Key, Base64.DEFAULT), expectedSha256Hex, outFile)
    }

}
