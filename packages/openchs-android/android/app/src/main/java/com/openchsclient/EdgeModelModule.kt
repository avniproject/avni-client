package com.openchsclient

import android.content.ComponentCallbacks2
import android.content.res.Configuration
import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.openchsclient.decoding.Decoders
import com.openchsclient.engine.InferenceEngine
import com.openchsclient.engine.PyTorchEngine
import com.openchsclient.preprocessing.Preprocessors
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.channels.FileChannel
import java.security.MessageDigest
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
 *   • Engine = `org.pytorch.Module` etc., dispatched via `InferenceEngine` (Kotlin interface).
 *     PyTorch Mobile is the only backend in this iteration; adding TFLite/ExecuTorch is one
 *     new class drop, not a rewrite.
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
 * `filesDir/<modelKey>.pt.tmp` (MODE_PRIVATE, 0600) — 64 KB chunk peak on the JVM heap.
 * The engine reads the file (`Module.load(path)` for PyTorch) and the bridge deletes the
 * file in a `finally` block; plaintext exists on disk for the duration of decrypt + load
 * (single-digit seconds for a ~18 MB model). This is consistent with the existing
 * `tools/edge-model/README.md` threat model: the AES key ships in the APK, so encryption
 * is obfuscation, not full IP protection. A determined reverser decrypts offline from the
 * APK and never touches the device — the brief on-disk window doesn't change that.
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
    }

    /** One inference engine per supported `engine` name in the registry override. */
    private val engines: Map<String, InferenceEngine> = mapOf(
        "pytorch" to PyTorchEngine(reactContext.applicationContext)
    )

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

    private sealed class LoadArgs {
        abstract val overrideJson: String?
        data class Plain(val assetPath: String, override val overrideJson: String?) : LoadArgs()
        data class Encrypted(
            val encryptedAssetPath: String,
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
        try {
            loadArgs[modelKey] = LoadArgs.Plain(assetPath, overrideJson)
            ensureLoaded(modelKey)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadModel($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_LOAD_ERROR", "Failed to load model '$modelKey': ${e.message}", e)
        }
    }

    /**
     * Load an AES-GCM-encrypted model from APK assets. Plaintext is held only in a direct
     * off-heap `ByteBuffer` until handed to the engine; the engine may then write a brief
     * temp file (PyTorch — see `PyTorchEngine`) before deleting it.
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
        try {
            loadArgs[modelKey] = LoadArgs.Encrypted(encryptedAssetPath, base64Key, sha256Hex, overrideJson)
            ensureLoaded(modelKey)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadEncryptedModel($modelKey): ${e.message}", e)
            promise.reject("EDGE_MODEL_LOAD_ERROR", "Failed to load encrypted model '$modelKey': ${e.message}", e)
        }
    }

    /**
     * Run inference on a caller-supplied flat `FloatArray`. `shape` is optional; if absent the
     * engine treats the array as a single-batch 1-D vector (`[1, N]`). The output is the
     * configured decoder's structured map.
     */
    @ReactMethod
    fun runInference(modelKey: String, inputData: ReadableArray, shape: ReadableArray?, promise: Promise) {
        try {
            ensureLoaded(modelKey)
            val handle = handles[modelKey]!!
            val contract = contracts[modelKey]!!
            val engine = engines[contract.engine]!!

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
        try {
            ensureLoaded(modelKey)
            val handle = handles[modelKey]!!
            val contract = contracts[modelKey]!!
            val engine = engines[contract.engine]!!

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
        }
    }

    // ── Lifecycle hooks ────────────────────────────────────────────────────────────────

    /**
     * Memory-pressure callback. Closes all engine handles and clears their off-heap state
     * when the OS asks for memory back. We deliberately do *not* clear `loadArgs`, so the
     * next inference can self-heal-reload without involving JS.
     */
    override fun onTrimMemory(level: Int) {
        if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) {
            Log.w(TAG, "onTrimMemory(level=$level) — releasing ${handles.size} handle(s); load-args retained for self-heal reload")
            handles.values.forEach { it.close() }
            handles.clear()
            contracts.clear()
        }
    }

    override fun onLowMemory() {
        // Older API — delegate to the same eviction path.
        onTrimMemory(ComponentCallbacks2.TRIM_MEMORY_COMPLETE)
    }

    override fun onConfigurationChanged(newConfig: Configuration) { /* no-op */ }

    override fun onCatalystInstanceDestroy() {
        Log.d(TAG, "onCatalystInstanceDestroy: closing ${handles.size} handle(s)")
        handles.values.forEach { it.close() }
        handles.clear()
        contracts.clear()
        loadArgs.clear()
        reactApplicationContext.applicationContext.unregisterComponentCallbacks(this)
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
                "Model not loaded: '$modelKey'. Call loadModel()/loadEncryptedModel() before inference."
            )
        val safeKey = modelKey.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val plaintextFile = File(reactApplicationContext.filesDir, "$safeKey.pt.tmp")
        try {
            when (args) {
                is LoadArgs.Plain -> streamAssetToFile(args.assetPath, plaintextFile)
                is LoadArgs.Encrypted -> streamDecryptToFile(args.encryptedAssetPath, args.base64Key, args.sha256Hex, plaintextFile)
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
        val engine = engines[contract.engine]
            ?: throw IllegalArgumentException(
                "Unknown engine '${contract.engine}'. Known: ${engines.keys}. " +
                "Add a new InferenceEngine implementation in `engine/` and register it in EdgeModelModule.engines."
            )
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

    /**
     * Stream-decrypt an AES-GCM-encrypted asset directly into a private file. Peak JVM-heap
     * footprint is the two 64 KB chunk buffers + the cipher's internal tag-buffer (≤16 B);
     * the 18 MB plaintext never materialises as a single allocation.
     *
     * Layout of the on-disk blob (matches `tools/edge-model/encrypt-model.js`):
     *   [12-byte IV][ciphertext...][16-byte GCM tag]
     *
     * We decrypt in `DECRYPT_CHUNK_BYTES` chunks via `Cipher.update` and stream the
     * produced plaintext straight into the destination `FileChannel`. SHA-256 is computed
     * incrementally over the same chunks; verification happens before the file is handed
     * to the engine — a mismatch deletes the file and throws.
     *
     * Note on AES/GCM streaming: Android's Conscrypt provider (Android 7+) streams GCM
     * decrypt output as ciphertext arrives, buffering only the final 16-byte tag.
     * `cipher.update` therefore emits ~chunk-sized plaintext per call; `doFinal` returns
     * at most a few bytes of tail. The pre-refactor 18 MB JVM-heap peak came from
     * `ByteBuffer.allocateDirect(plaintextLen)` (ART counts direct buffers against the
     * growth limit), not from `doFinal` — eliminating it gets the bridge below the
     * default 96 MB heap cap without needing `largeHeap`.
     */
    private fun streamDecryptToFile(
        encryptedAssetPath: String,
        base64Key: String,
        expectedSha256Hex: String,
        outFile: File
    ) {
        val fd = reactApplicationContext.assets.openFd(encryptedAssetPath)
        val totalLen = fd.declaredLength
        val ciphertextLen = totalLen - GCM_IV_BYTES

        if (BuildConfig.DEBUG) {
            Log.d(TAG, "streamDecryptToFile($encryptedAssetPath): total=$totalLen → ${outFile.absolutePath}")
        }

        val mapped = FileInputStream(fd.fileDescriptor).use { fis ->
            fis.channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, totalLen)
        }
        // First 12 bytes = IV.
        val iv = ByteArray(GCM_IV_BYTES).also { mapped.get(it) }

        val key = Base64.decode(base64Key, Base64.DEFAULT)
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
                    mapped.get(chunk, 0, n)
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

            // Plaintext integrity check — defends against a swapped blob with valid GCM auth
            // (e.g. someone re-encrypted a different model with the same key).
            val actual = md.digest().joinToString("") { "%02x".format(it) }
            if (!actual.equals(expectedSha256Hex, ignoreCase = true)) {
                throw SecurityException("Decrypted plaintext SHA-256 mismatch (expected=$expectedSha256Hex, actual=$actual)")
            }
        } finally {
            // Zero the Java byte arrays. We can't un-page the mmap'd ciphertext (it's the
            // APK asset) or the on-disk plaintext (caller deletes it), but we clean up our
            // own scratch space so it doesn't linger in a GC-able allocation.
            chunk.fill(0); outChunk.fill(0); key.fill(0)
        }
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
