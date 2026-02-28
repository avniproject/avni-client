package com.openchsclient.ai;

import android.content.res.AssetFileDescriptor;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.module.annotations.ReactModule;

import java.io.File;
import java.io.FileInputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;

/**
 * TFLiteInferenceModule - Native module for running TensorFlow Lite models on-device.
 * Provides model loading, inference execution, and model information retrieval.
 *
 * Note: Actual TFLite interpreter integration requires adding the TensorFlow Lite
 * dependency to build.gradle:
 *   implementation 'org.tensorflow:tensorflow-lite:2.14.0'
 *   implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'
 *   implementation 'org.tensorflow:tensorflow-lite-gpu:2.14.0' // optional GPU delegate
 */
@ReactModule(name = "TFLiteInferenceModule")
public class TFLiteInferenceModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TFLiteInferenceModule";
    private static final String MODELS_DIR = "ai_models";

    private final ReactApplicationContext reactContext;

    public TFLiteInferenceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "TFLiteInferenceModule";
    }

    /**
     * Run inference on a TFLite model.
     *
     * @param modelFile  Model file name (in assets/ai_models/ directory)
     * @param inputData  Base64-encoded input data or float array
     * @param options    Inference options (inputShape, outputType, delegate, numThreads, useXNNPACK)
     * @param promise    Promise to resolve with inference results
     */
    @ReactMethod
    public void runModel(String modelFile, String inputData, ReadableMap options, Promise promise) {
        try {
            Log.d(TAG, "Running inference with model: " + modelFile);

            // Validate model file exists
            if (!isModelFileAvailable(modelFile)) {
                promise.reject("MODEL_NOT_FOUND", "Model file not found: " + modelFile);
                return;
            }

            long startTime = System.currentTimeMillis();

            // TODO: Load TFLite interpreter and run inference
            // This is a placeholder that returns a structured result.
            // Full implementation requires TFLite dependency in build.gradle.
            //
            // Example implementation outline:
            // 1. MappedByteBuffer modelBuffer = loadModelFile(modelFile);
            // 2. Interpreter.Options tfliteOptions = new Interpreter.Options();
            // 3. tfliteOptions.setNumThreads(options.getInt("numThreads"));
            // 4. Interpreter interpreter = new Interpreter(modelBuffer, tfliteOptions);
            // 5. interpreter.run(inputBuffer, outputBuffer);
            // 6. Parse output based on outputType (classification/regression/segmentation)

            long inferenceTime = System.currentTimeMillis() - startTime;

            WritableMap result = Arguments.createMap();
            result.putString("status", "not_implemented");
            result.putString("modelFile", modelFile);
            result.putDouble("inferenceTimeMs", inferenceTime);
            result.putString("message", "TFLite inference requires tensorflow-lite dependency. Add to build.gradle to enable.");

            promise.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Inference failed: " + e.getMessage(), e);
            promise.reject("INFERENCE_ERROR", "TFLite inference failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get information about a TFLite model file.
     *
     * @param modelFile Model file name
     * @param promise   Promise to resolve with model info
     */
    @ReactMethod
    public void getModelInfo(String modelFile, Promise promise) {
        try {
            String modelPath = getModelPath(modelFile);
            File file = new File(modelPath);

            if (!file.exists()) {
                // Check in assets
                try {
                    AssetFileDescriptor afd = reactContext.getAssets().openFd(MODELS_DIR + "/" + modelFile);
                    WritableMap info = Arguments.createMap();
                    info.putString("fileName", modelFile);
                    info.putDouble("fileSize", afd.getLength());
                    info.putString("location", "assets");
                    info.putString("version", "unknown");
                    afd.close();
                    promise.resolve(info);
                    return;
                } catch (Exception assetError) {
                    promise.reject("MODEL_NOT_FOUND", "Model file not found: " + modelFile);
                    return;
                }
            }

            WritableMap info = Arguments.createMap();
            info.putString("fileName", modelFile);
            info.putDouble("fileSize", file.length());
            info.putString("location", "filesystem");
            info.putString("version", "unknown");
            promise.resolve(info);

        } catch (Exception e) {
            Log.e(TAG, "Failed to get model info: " + e.getMessage(), e);
            promise.reject("MODEL_INFO_ERROR", "Failed to get model info: " + e.getMessage(), e);
        }
    }

    /**
     * Check if a model file is available.
     *
     * @param modelFile Model file name
     * @param promise   Promise to resolve with boolean
     */
    @ReactMethod
    public void isModelAvailable(String modelFile, Promise promise) {
        try {
            promise.resolve(isModelFileAvailable(modelFile));
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    private boolean isModelFileAvailable(String modelFile) {
        // Check filesystem first
        File file = new File(getModelPath(modelFile));
        if (file.exists()) return true;

        // Check assets
        try {
            AssetFileDescriptor afd = reactContext.getAssets().openFd(MODELS_DIR + "/" + modelFile);
            afd.close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String getModelPath(String modelFile) {
        File modelsDir = new File(reactContext.getFilesDir(), MODELS_DIR);
        return new File(modelsDir, modelFile).getAbsolutePath();
    }
}
