package com.openchsclient;

import com.facebook.soloader.SoLoader;
import android.util.Log;

public class SoLoaderFix {
    private static final String TAG = "SoLoaderFix";
    
    public static void preloadLibraries() {
        try {
            // Load libhermes.so first
            SoLoader.loadLibrary("hermes");
            Log.i(TAG, "Loaded libhermes.so");
            
            // Try hermes_executor, ignore if fails (means it's merged)
            try {
                SoLoader.loadLibrary("hermes_executor");
                Log.i(TAG, "Loaded libhermes_executor.so (separate library mode)");
            } catch (UnsatisfiedLinkError e) {
                Log.i(TAG, "hermes_executor not found - using merged mode");
            }
            
            // Ensure reactnative is loaded (contains merged Hermes)
            try {
                SoLoader.loadLibrary("reactnative");
                Log.i(TAG, "Loaded libreactnative.so");
            } catch (UnsatisfiedLinkError e) {
                Log.w(TAG, "reactnative already loaded: " + e.getMessage());
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error preloading libraries: " + e.getMessage());
        }
    }
}
