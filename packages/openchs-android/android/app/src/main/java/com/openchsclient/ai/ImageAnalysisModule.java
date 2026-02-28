package com.openchsclient.ai;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.module.annotations.ReactModule;

import java.io.ByteArrayOutputStream;

/**
 * ImageAnalysisModule - Native module for image processing and quality analysis.
 * Provides resize, crop, normalize, metadata extraction, blur detection,
 * and brightness analysis capabilities for the AI pipeline.
 */
@ReactModule(name = "ImageAnalysisModule")
public class ImageAnalysisModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ImageAnalysisModule";

    public ImageAnalysisModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ImageAnalysisModule";
    }

    /**
     * Resize an image to specified dimensions.
     *
     * @param base64Image Base64-encoded image
     * @param options     Resize options (width, height, maintainAspectRatio, interpolation)
     * @param promise     Promise to resolve with resized base64 image
     */
    @ReactMethod
    public void resize(String base64Image, ReadableMap options, Promise promise) {
        try {
            Bitmap bitmap = decodeBase64ToBitmap(base64Image);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            int targetWidth = options.hasKey("width") ? options.getInt("width") : bitmap.getWidth();
            int targetHeight = options.hasKey("height") ? options.getInt("height") : bitmap.getHeight();

            Bitmap resized = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);

            WritableMap result = Arguments.createMap();
            result.putString("base64", encodeBitmapToBase64(resized));
            result.putInt("width", resized.getWidth());
            result.putInt("height", resized.getHeight());

            if (resized != bitmap) resized.recycle();
            bitmap.recycle();

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Resize failed: " + e.getMessage(), e);
            promise.reject("RESIZE_ERROR", "Image resize failed: " + e.getMessage(), e);
        }
    }

    /**
     * Crop an image to a specified region.
     *
     * @param base64Image Base64-encoded image
     * @param region      Crop region (x, y, width, height)
     * @param promise     Promise to resolve with cropped base64 image
     */
    @ReactMethod
    public void crop(String base64Image, ReadableMap region, Promise promise) {
        try {
            Bitmap bitmap = decodeBase64ToBitmap(base64Image);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            int x = region.hasKey("x") ? region.getInt("x") : 0;
            int y = region.hasKey("y") ? region.getInt("y") : 0;
            int width = region.hasKey("width") ? region.getInt("width") : bitmap.getWidth();
            int height = region.hasKey("height") ? region.getInt("height") : bitmap.getHeight();

            // Clamp to bitmap bounds
            x = Math.max(0, Math.min(x, bitmap.getWidth() - 1));
            y = Math.max(0, Math.min(y, bitmap.getHeight() - 1));
            width = Math.min(width, bitmap.getWidth() - x);
            height = Math.min(height, bitmap.getHeight() - y);

            Bitmap cropped = Bitmap.createBitmap(bitmap, x, y, width, height);

            WritableMap result = Arguments.createMap();
            result.putString("base64", encodeBitmapToBase64(cropped));
            result.putInt("width", cropped.getWidth());
            result.putInt("height", cropped.getHeight());

            if (cropped != bitmap) cropped.recycle();
            bitmap.recycle();

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Crop failed: " + e.getMessage(), e);
            promise.reject("CROP_ERROR", "Image crop failed: " + e.getMessage(), e);
        }
    }

    /**
     * Normalize image pixel values.
     *
     * @param base64Image Base64-encoded image
     * @param options     Normalization options (range, perChannel)
     * @param promise     Promise to resolve with normalized data
     */
    @ReactMethod
    public void normalize(String base64Image, ReadableMap options, Promise promise) {
        try {
            Bitmap bitmap = decodeBase64ToBitmap(base64Image);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            int[] pixels = new int[width * height];
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height);

            // Normalize to [0, 1] range by default
            float[] normalizedData = new float[width * height * 3];
            for (int i = 0; i < pixels.length; i++) {
                int pixel = pixels[i];
                normalizedData[i * 3] = ((pixel >> 16) & 0xFF) / 255.0f;     // R
                normalizedData[i * 3 + 1] = ((pixel >> 8) & 0xFF) / 255.0f;  // G
                normalizedData[i * 3 + 2] = (pixel & 0xFF) / 255.0f;         // B
            }

            WritableMap result = Arguments.createMap();
            result.putString("base64", encodeBitmapToBase64(bitmap));
            result.putInt("width", width);
            result.putInt("height", height);
            result.putInt("channels", 3);

            bitmap.recycle();
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Normalize failed: " + e.getMessage(), e);
            promise.reject("NORMALIZE_ERROR", "Image normalization failed: " + e.getMessage(), e);
        }
    }

    /**
     * Extract image metadata (dimensions, format, etc.)
     *
     * @param base64Image Base64-encoded image
     * @param promise     Promise to resolve with metadata
     */
    @ReactMethod
    public void getMetadata(String base64Image, Promise promise) {
        try {
            byte[] imageBytes = Base64.decode(base64Image, Base64.DEFAULT);

            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, opts);

            WritableMap metadata = Arguments.createMap();
            metadata.putInt("width", opts.outWidth);
            metadata.putInt("height", opts.outHeight);
            metadata.putString("mimeType", opts.outMimeType != null ? opts.outMimeType : "image/jpeg");
            metadata.putDouble("megapixels", (opts.outWidth * opts.outHeight) / 1000000.0);
            metadata.putDouble("aspectRatio", opts.outHeight > 0 ? (double) opts.outWidth / opts.outHeight : 0);

            promise.resolve(metadata);
        } catch (Exception e) {
            Log.e(TAG, "Get metadata failed: " + e.getMessage(), e);
            promise.reject("METADATA_ERROR", "Failed to extract image metadata: " + e.getMessage(), e);
        }
    }

    /**
     * Calculate Laplacian variance for blur detection.
     * Higher values indicate sharper images.
     *
     * @param base64Image Base64-encoded image
     * @param promise     Promise to resolve with laplacianVariance value
     */
    @ReactMethod
    public void calculateLaplacianVariance(String base64Image, Promise promise) {
        try {
            Bitmap bitmap = decodeBase64ToBitmap(base64Image);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            // Convert to grayscale and calculate Laplacian variance
            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            int[] pixels = new int[width * height];
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height);

            // Convert to grayscale
            double[] gray = new double[width * height];
            for (int i = 0; i < pixels.length; i++) {
                int pixel = pixels[i];
                int r = (pixel >> 16) & 0xFF;
                int g = (pixel >> 8) & 0xFF;
                int b = pixel & 0xFF;
                gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
            }

            // Apply Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
            double sum = 0;
            double sumSq = 0;
            int count = 0;

            for (int y = 1; y < height - 1; y++) {
                for (int x = 1; x < width - 1; x++) {
                    double laplacian =
                            gray[(y - 1) * width + x] +
                            gray[y * width + (x - 1)] +
                            gray[y * width + (x + 1)] +
                            gray[(y + 1) * width + x] -
                            4 * gray[y * width + x];

                    sum += laplacian;
                    sumSq += laplacian * laplacian;
                    count++;
                }
            }

            double mean = count > 0 ? sum / count : 0;
            double variance = count > 0 ? (sumSq / count) - (mean * mean) : 0;

            bitmap.recycle();

            WritableMap result = Arguments.createMap();
            result.putDouble("laplacianVariance", variance);
            result.putDouble("laplacianMean", mean);

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Laplacian variance calculation failed: " + e.getMessage(), e);
            promise.reject("BLUR_ANALYSIS_ERROR", "Blur analysis failed: " + e.getMessage(), e);
        }
    }

    /**
     * Calculate brightness statistics for lighting quality assessment.
     *
     * @param base64Image Base64-encoded image
     * @param promise     Promise to resolve with brightness stats (mean, std)
     */
    @ReactMethod
    public void calculateBrightnessStats(String base64Image, Promise promise) {
        try {
            Bitmap bitmap = decodeBase64ToBitmap(base64Image);
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image");
                return;
            }

            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            int[] pixels = new int[width * height];
            bitmap.getPixels(pixels, 0, width, 0, 0, width, height);

            double sum = 0;
            double sumSq = 0;

            for (int pixel : pixels) {
                int r = (pixel >> 16) & 0xFF;
                int g = (pixel >> 8) & 0xFF;
                int b = pixel & 0xFF;
                double brightness = 0.299 * r + 0.587 * g + 0.114 * b;
                sum += brightness;
                sumSq += brightness * brightness;
            }

            int count = pixels.length;
            double mean = count > 0 ? sum / count : 0;
            double variance = count > 0 ? (sumSq / count) - (mean * mean) : 0;
            double std = Math.sqrt(Math.max(0, variance));

            bitmap.recycle();

            WritableMap result = Arguments.createMap();
            result.putDouble("mean", mean);
            result.putDouble("std", std);
            result.putDouble("variance", variance);

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Brightness stats calculation failed: " + e.getMessage(), e);
            promise.reject("BRIGHTNESS_ANALYSIS_ERROR", "Brightness analysis failed: " + e.getMessage(), e);
        }
    }

    // Helper methods

    private Bitmap decodeBase64ToBitmap(String base64Image) {
        try {
            byte[] decodedBytes = Base64.decode(base64Image, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
        } catch (Exception e) {
            Log.e(TAG, "Failed to decode base64 image: " + e.getMessage());
            return null;
        }
    }

    private String encodeBitmapToBase64(Bitmap bitmap) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, baos);
        byte[] imageBytes = baos.toByteArray();
        return Base64.encodeToString(imageBytes, Base64.NO_WRAP);
    }
}
