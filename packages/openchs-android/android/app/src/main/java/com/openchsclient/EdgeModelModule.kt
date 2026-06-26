package com.openchsclient

import android.content.ComponentCallbacks2
import android.content.res.Configuration
import android.graphics.BitmapFactory
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
 * Generic on-device inference bridge for the Avni client
 * (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * ── Design ─────────────────────────────────────────────────────────────────────────
 * The bridge is **engine-agnostic** and **model-agnostic**:
 *   • Per-model semantics — which engine, which preprocessor, which decoder — live in
 *     `assets/models/registry.json` as a small declarative DSL. This file owns no model-specific
 *     math and does not branch on `modelKey`.
 *   • Engine = `ai.onnxruntime.OrtSession` etc., dispatched via `InferenceEngine` (Kotlin
 *     interface). ONNX Runtime Mobile is the backend for the tanuh ensemble; adding
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
 * (single-digit seconds for a ~18 MB model). For the asset-bundled flow the AES key ships in the
 * APK (obfuscation, not full IP protection per `tools/edge-model/README.md`); for the file-path
 * flow the key arrives as a call argument delivered out-of-band from the server key endpoint.
 *
 * The module registers `ComponentCallbacks2` to receive memory-pressure signals.
 * Backgrounding the app for a camera intent or phone call does *not* trigger eviction unless
 * the OS reports actual pressure — the common case (form → camera → return → run inference)
 * keeps the runtime warm.
 *
 * ── JS-facing API (via NativeModules.EdgeModelModule) ─────────────────────────────
 *   getRegistry(): Promise<object>
 *   loadModel(modelKey, assetPath, overrideJson): Promise<boolean>
 *   loadEncryptedModel(modelKey, encryptedAssetPath, base64Key, sha256, overrideJson): Promise<boolean>
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
        private const val REGISTRY_ASSET = "models/registry.json"
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
     * Engine providers, one per supported `engine` name in the registry override, resolved
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
                "Unknown or unavailable engine '$engineName'. Available: ${engineProviders.keys}. " +
                "(ONNX Runtime ships only in the tanuh flavour.)"
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
        data class Plain(val assetPath: String, override val overrideJson: String?) : LoadArgs()
        data class Encrypted(
            val encryptedAssetPath: String,
            val base64Key: String,
            val sha256Hex: String,
            override val overrideJson: String?
        ) : LoadArgs()
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

    /**
     * Read the per-flavour model registry (`assets/models/registry.json`) and return its
     * parsed contents. Called once at app boot from `EdgeModelService.init()`. The JS side
     * caches the result and uses it to resolve `modelKey` → asset spec on each inference.
     */
    @ReactMethod
    fun getRegistry(promise: Promise) {
        try {
            val raw = reactApplicationContext.assets.open(REGISTRY_ASSET).bufferedReader().use { it.readText() }
            val map = jsonStringToWritableMap(raw)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "getRegistry: failed to read $REGISTRY_ASSET: ${e.message}", e)
            promise.reject("REGISTRY_LOAD_ERROR", "Failed to read $REGISTRY_ASSET: ${e.message}", e)
        }
    }

    /**
     * Load a plaintext model from APK assets. Idempotent — calling twice for the same
     * `modelKey` is a no-op. The override JSON is mandatory and describes the engine,
     * preprocessor, and decoder for this model.
     */
    @ReactMethod
    fun loadModel(modelKey: String, assetPath: String, overrideJson: String?, promise: Promise) {
        inferenceLock.lock()
        try {
            loadArgs[modelKey] = LoadArgs.Plain(assetPath, overrideJson)
            ensureLoaded(modelKey)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadModel($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_LOAD_ERROR", "Failed to load model '$modelKey': ${e.message}", e)
        } finally {
            inferenceLock.unlock()
        }
    }

    /**
     * Load an AES-GCM-encrypted model from APK assets. Plaintext is streamed to a private
     * temp file which the engine reads during `load`; the bridge deletes it immediately after.
     */
    @ReactMethod
    fun loadEncryptedModel(
        modelKey: String,
        encryptedAssetPath: String,
        base64Key: String,
        sha256Hex: String,
        overrideJson: String?,
        promise: Promise
    ) {
        inferenceLock.lock()
        try {
            loadArgs[modelKey] = LoadArgs.Encrypted(encryptedAssetPath, base64Key, sha256Hex, overrideJson)
            ensureLoaded(modelKey)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadEncryptedModel($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_LOAD_ERROR", "Failed to load encrypted model '$modelKey': ${e.message}", e)
        } finally {
            inferenceLock.unlock()
        }
    }

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

            val raw = BitmapFactory.decodeFile(imagePath)
                ?: throw IllegalArgumentException("Cannot decode image at '$imagePath'. Check the path and file format.")
            // Bitmaps back pixel data in native heap; release eagerly so a session of camera-path
            // images doesn't pile up native memory and trigger onTrimMemory (which would evict
            // the model). The preprocessor never retains `raw` past return.
            try {
                if (BuildConfig.DEBUG) {
                    // Diagnostic — log decoded bitmap geometry + EXIF orientation. If EXIF reports
                    // anything other than 1 (NORMAL), the on-screen image is rotated relative to the
                    // raw pixels we feed the model. The TANUH PoC has the same `decodeFile` codepath,
                    // so for parity-comparison runs both apps should agree. But if training data was
                    // pre-rotated and field images aren't, the model sees inputs it wasn't trained on.
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
                "Model not loaded: '$modelKey'. Call loadModel()/loadEncryptedModel()/loadEncryptedModelFromFile() before inference."
            )
        val safeKey = modelKey.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val plaintextFile = File(reactApplicationContext.filesDir, "$safeKey.model.tmp")
        try {
            when (args) {
                is LoadArgs.Plain -> streamAssetToFile(args.assetPath, plaintextFile)
                is LoadArgs.Encrypted -> streamDecryptToFile(args.encryptedAssetPath, args.base64Key, args.sha256Hex, plaintextFile)
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

    /**
     * Copy a plaintext APK asset into a private file. Uses `FileChannel.transferTo` so the
     * kernel can splice page-cache pages directly into the destination without bouncing
     * through the Java heap.
     */
    private fun streamAssetToFile(assetPath: String, outFile: File) {
        val fd = reactApplicationContext.assets.openFd(assetPath)
        FileInputStream(fd.fileDescriptor).use { fis ->
            FileOutputStream(outFile).use { fos ->
                val inCh = fis.channel
                val outCh = fos.channel
                var transferred = 0L
                while (transferred < fd.declaredLength) {
                    val n = inCh.transferTo(fd.startOffset + transferred, fd.declaredLength - transferred, outCh)
                    if (n <= 0) throw IllegalStateException("Asset transfer stalled at $transferred / ${fd.declaredLength}")
                    transferred += n
                }
            }
        }
    }

    // Blob layout (matches `tools/edge-model/encrypt-model.js`): [12-byte IV][ciphertext][16-byte GCM tag].
    private fun streamDecryptToFile(
        encryptedAssetPath: String,
        base64Key: String,
        expectedSha256Hex: String,
        outFile: File
    ) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "streamDecryptToFile(asset=$encryptedAssetPath) → ${outFile.absolutePath}")
        }
        val fd = reactApplicationContext.assets.openFd(encryptedAssetPath)
        FileInputStream(fd.fileDescriptor).use { fis ->
            decryptChannelToFile(fis.channel, fd.startOffset, fd.declaredLength, Base64.decode(base64Key, Base64.DEFAULT), expectedSha256Hex, outFile)
        }
    }

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

    private fun jsonStringToWritableMap(raw: String): WritableMap {
        val obj = org.json.JSONObject(raw)
        return jsonObjectToWritableMap(obj)
    }

    private fun jsonObjectToWritableMap(obj: org.json.JSONObject): WritableMap {
        val map = Arguments.createMap()
        val keys = obj.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            when (val v = obj.opt(key)) {
                null, org.json.JSONObject.NULL -> map.putNull(key)
                is org.json.JSONObject -> map.putMap(key, jsonObjectToWritableMap(v))
                is org.json.JSONArray -> map.putArray(key, jsonArrayToWritableArray(v))
                is Boolean -> map.putBoolean(key, v)
                is Int -> map.putInt(key, v)
                is Long -> map.putDouble(key, v.toDouble())
                is Double -> map.putDouble(key, v)
                is String -> map.putString(key, v)
                else -> map.putString(key, v.toString())
            }
        }
        return map
    }

    private fun jsonArrayToWritableArray(arr: org.json.JSONArray): WritableArray {
        val out = Arguments.createArray()
        for (i in 0 until arr.length()) {
            when (val v = arr.opt(i)) {
                null, org.json.JSONObject.NULL -> out.pushNull()
                is org.json.JSONObject -> out.pushMap(jsonObjectToWritableMap(v))
                is org.json.JSONArray -> out.pushArray(jsonArrayToWritableArray(v))
                is Boolean -> out.pushBoolean(v)
                is Int -> out.pushInt(v)
                is Long -> out.pushDouble(v.toDouble())
                is Double -> out.pushDouble(v)
                is String -> out.pushString(v)
                else -> out.pushString(v.toString())
            }
        }
        return out
    }
}
