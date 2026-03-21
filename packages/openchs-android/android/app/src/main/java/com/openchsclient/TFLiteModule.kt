package com.openchsclient

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import com.facebook.react.bridge.*
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

/**
 * Native module that loads a TFLite model from the APK asset bundle and runs inference.
 *
 * Model expectations (oral cancer classifier):
 *   Input:  float32, shape (1, 3, 224, 224) = 150,528 floats
 *           CHW order, ImageNet-normalized (mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225])
 *   Output: float32, shape (1, 2) — scores for [oral_normal, oral_scc]
 *
 * JS API (via NativeModules.TFLiteModule):
 *   loadModel(assetPath: string): Promise<boolean>
 *   runInference(modelPath: string, inputData: number[]): Promise<number[]>
 *   runInferenceOnImage(modelPath: string, imagePath: string): Promise<number[]>
 */
class TFLiteModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "TFLiteModule"
        private const val IMAGE_SIZE = 224
        // ImageNet normalization — must match Python preprocessing
        private val MEAN = floatArrayOf(0.485f, 0.456f, 0.406f) // R, G, B
        private val STD  = floatArrayOf(0.229f, 0.224f, 0.225f) // R, G, B
    }

    private val interpreters = HashMap<String, Interpreter>()

    override fun getName(): String = "TFLiteModule"

    @ReactMethod
    fun loadModel(assetPath: String, promise: Promise) {
        Log.d(TAG, "loadModel called: assetPath='$assetPath'")
        try {
            if (interpreters.containsKey(assetPath)) {
                Log.d(TAG, "loadModel: interpreter already cached for '$assetPath', skipping reload")
                promise.resolve(true)
                return
            }

            Log.d(TAG, "loadModel: loading model from assets...")
            val buffer = loadModelFromAssets(assetPath)
            Log.d(TAG, "loadModel: model buffer loaded, size=${buffer.capacity()} bytes")

            val options = Interpreter.Options().apply { numThreads = 2 }
            val interpreter = Interpreter(buffer, options)
            interpreters[assetPath] = interpreter

            val inputTensor = interpreter.getInputTensor(0)
            val outputTensor = interpreter.getOutputTensor(0)
            Log.d(TAG, "loadModel: input  tensor — shape=${inputTensor.shape().toList()}, dtype=${inputTensor.dataType()}, expectedFloats=${inputTensor.shape().fold(1) { a, d -> a * d }}")
            Log.d(TAG, "loadModel: output tensor — shape=${outputTensor.shape().toList()}, dtype=${outputTensor.dataType()}, outputFloats=${outputTensor.shape().fold(1) { a, d -> a * d }}")
            Log.d(TAG, "loadModel: model loaded and cached successfully")

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "loadModel: FAILED for '$assetPath': ${e.message}", e)
            promise.reject("TFLITE_LOAD_ERROR", "Failed to load model '$assetPath': ${e.message}", e)
        }
    }

    /**
     * Run inference on a pre-processed float array.
     * The caller is responsible for resizing, normalizing, and transposing to CHW.
     * Array length must match the model's input tensor size (150,528 for this model).
     */
    @ReactMethod
    fun runInference(modelPath: String, inputData: ReadableArray, promise: Promise) {
        Log.d(TAG, "runInference called: modelPath='$modelPath', inputData.size=${inputData.size()}")
        try {
            val interpreter = getInterpreter(modelPath)
            val inputBuffer = buildInputBufferFromArray(interpreter, inputData)
            val (outputBuffer, outputSize) = buildOutputBuffer(interpreter)

            Log.d(TAG, "runInference: invoking interpreter...")
            interpreter.run(inputBuffer, outputBuffer)

            promise.resolve(readOutputBuffer(outputBuffer, outputSize))
        } catch (e: Exception) {
            Log.e(TAG, "runInference: FAILED: ${e.message}", e)
            promise.reject("TFLITE_INFERENCE_ERROR", "Inference failed: ${e.message}", e)
        }
    }

    /**
     * Run inference directly from an image file path.
     * Handles all preprocessing: decode → resize 224×224 → normalize → CHW transpose.
     * imagePath must be an absolute path to a JPEG/PNG on the device (e.g. from react-native-image-picker).
     */
    @ReactMethod
    fun runInferenceOnImage(modelPath: String, imagePath: String, promise: Promise) {
        Log.d(TAG, "runInferenceOnImage called: modelPath='$modelPath', imagePath='$imagePath'")
        try {
            val interpreter = getInterpreter(modelPath)

            Log.d(TAG, "runInferenceOnImage: decoding image from '$imagePath'")
            val raw = BitmapFactory.decodeFile(imagePath)
                ?: throw IllegalArgumentException("Cannot decode image at '$imagePath'. Check the path and file format.")
            Log.d(TAG, "runInferenceOnImage: decoded bitmap ${raw.width}x${raw.height}, config=${raw.config}")

            val resized = if (raw.width == IMAGE_SIZE && raw.height == IMAGE_SIZE) {
                Log.d(TAG, "runInferenceOnImage: image already ${IMAGE_SIZE}x${IMAGE_SIZE}, no resize needed")
                raw
            } else {
                Log.d(TAG, "runInferenceOnImage: resizing ${raw.width}x${raw.height} → ${IMAGE_SIZE}x${IMAGE_SIZE}")
                Bitmap.createScaledBitmap(raw, IMAGE_SIZE, IMAGE_SIZE, true)
            }

            val inputBuffer = preprocessImageToBuffer(resized)
            val (outputBuffer, outputSize) = buildOutputBuffer(interpreter)

            Log.d(TAG, "runInferenceOnImage: invoking interpreter...")
            interpreter.run(inputBuffer, outputBuffer)

            promise.resolve(readOutputBuffer(outputBuffer, outputSize))
        } catch (e: Exception) {
            Log.e(TAG, "runInferenceOnImage: FAILED: ${e.message}", e)
            promise.reject("TFLITE_INFERENCE_ERROR", "Image inference failed: ${e.message}", e)
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private fun getInterpreter(modelPath: String): Interpreter {
        return interpreters[modelPath]
            ?: throw IllegalStateException(
                "Model not loaded: '$modelPath'. Call loadModel() before runInference()."
            )
    }

    private fun buildInputBufferFromArray(interpreter: Interpreter, inputData: ReadableArray): ByteBuffer {
        val inputTensor = interpreter.getInputTensor(0)
        val inputShape = inputTensor.shape()
        val inputSize = inputShape.fold(1) { acc, dim -> acc * dim }
        Log.d(TAG, "buildInputBufferFromArray: shape=${inputShape.toList()}, expected=$inputSize, provided=${inputData.size()}")

        if (inputTensor.dataType() != DataType.FLOAT32) {
            throw IllegalStateException("Unsupported input dtype: ${inputTensor.dataType()}. Expected FLOAT32.")
        }
        if (inputData.size() != inputSize) {
            throw IllegalArgumentException(
                "Input size mismatch: model expects $inputSize floats ${inputShape.toList()} but received ${inputData.size()}."
            )
        }

        val buffer = ByteBuffer.allocateDirect(inputSize * Float.SIZE_BYTES)
        buffer.order(ByteOrder.nativeOrder())
        for (i in 0 until inputData.size()) {
            buffer.putFloat(inputData.getDouble(i).toFloat())
        }
        buffer.rewind()

        val previewCount = minOf(6, inputSize)
        val preview = (0 until previewCount).map { buffer.getFloat(it * Float.SIZE_BYTES) }
        Log.d(TAG, "buildInputBufferFromArray: first $previewCount values = $preview")

        return buffer
    }

    /**
     * Preprocesses a Bitmap to a float32 ByteBuffer in CHW order with ImageNet normalization.
     *
     * Matches the Python preprocessing:
     *   img_array = np.array(img).astype(np.float32) / 255.0
     *   img_array = (img_array - mean) / std
     *   img_array = img_array.transpose(2, 0, 1)  # HWC → CHW
     *   return np.expand_dims(img_array, axis=0)   # → (1, 3, 224, 224)
     */
    private fun preprocessImageToBuffer(bitmap: Bitmap): ByteBuffer {
        val h = IMAGE_SIZE
        val w = IMAGE_SIZE
        val c = 3

        // Extract all pixels once — avoids repeated getPixel() calls
        val pixels = IntArray(w * h)
        bitmap.getPixels(pixels, 0, w, 0, 0, w, h)

        // Output shape: (1, 3, 224, 224) in CHW order
        val buffer = ByteBuffer.allocateDirect(c * h * w * Float.SIZE_BYTES)
        buffer.order(ByteOrder.nativeOrder())

        for (channel in 0 until c) {
            for (row in 0 until h) {
                for (col in 0 until w) {
                    val pixel = pixels[row * w + col]
                    val raw = when (channel) {
                        0 -> (pixel shr 16) and 0xFF  // R
                        1 -> (pixel shr 8)  and 0xFF  // G
                        2 ->  pixel         and 0xFF  // B
                        else -> 0
                    }
                    val normalized = (raw / 255.0f - MEAN[channel]) / STD[channel]
                    buffer.putFloat(normalized)
                }
            }
        }
        buffer.rewind()

        // Log a few values from each channel for sanity
        Log.d(TAG, "preprocessImageToBuffer: channel 0 (R) first value = ${buffer.getFloat(0 * Float.SIZE_BYTES)}")
        Log.d(TAG, "preprocessImageToBuffer: channel 1 (G) first value = ${buffer.getFloat(h * w * Float.SIZE_BYTES)}")
        Log.d(TAG, "preprocessImageToBuffer: channel 2 (B) first value = ${buffer.getFloat(2 * h * w * Float.SIZE_BYTES)}")

        return buffer
    }

    private fun buildOutputBuffer(interpreter: Interpreter): Pair<ByteBuffer, Int> {
        val outputTensor = interpreter.getOutputTensor(0)
        val outputShape = outputTensor.shape()
        val outputSize = outputShape.fold(1) { acc, dim -> acc * dim }
        Log.d(TAG, "buildOutputBuffer: shape=${outputShape.toList()}, outputFloats=$outputSize")

        val buffer = ByteBuffer.allocateDirect(outputSize * Float.SIZE_BYTES)
        buffer.order(ByteOrder.nativeOrder())
        return Pair(buffer, outputSize)
    }

    private fun readOutputBuffer(outputBuffer: ByteBuffer, outputSize: Int): WritableArray {
        outputBuffer.rewind()
        val results = WritableNativeArray()
        val values = mutableListOf<Float>()
        repeat(outputSize) {
            val v = outputBuffer.float
            values.add(v)
            results.pushDouble(v.toDouble())
        }
        Log.d(TAG, "readOutputBuffer: raw output = $values")
        if (outputSize == 2) {
            val label = if (values[0] > values[1]) "oral_normal(0)" else "oral_scc(1)"
            Log.d(TAG, "readOutputBuffer: predicted = $label [normal=${values[0]}, scc=${values[1]}]")
        }
        return results
    }

    private fun loadModelFromAssets(assetPath: String): MappedByteBuffer {
        Log.d(TAG, "loadModelFromAssets: opening asset '$assetPath'")
        val fileDescriptor = reactApplicationContext.assets.openFd(assetPath)
        Log.d(TAG, "loadModelFromAssets: startOffset=${fileDescriptor.startOffset}, length=${fileDescriptor.declaredLength}")
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        return fileChannel.map(
            FileChannel.MapMode.READ_ONLY,
            fileDescriptor.startOffset,
            fileDescriptor.declaredLength
        )
    }

    override fun onCatalystInstanceDestroy() {
        Log.d(TAG, "onCatalystInstanceDestroy: closing ${interpreters.size} interpreter(s)")
        interpreters.values.forEach { it.close() }
        interpreters.clear()
    }
}
