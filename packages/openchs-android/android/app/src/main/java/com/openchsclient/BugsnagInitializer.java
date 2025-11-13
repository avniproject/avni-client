package com.openchsclient;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import com.bugsnag.android.Bugsnag;
import com.bugsnag.android.Configuration;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@ReactModule(name = "BugsnagInitializer")
public class BugsnagInitializer extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private static boolean isInitialized = false;

    public BugsnagInitializer(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "BugsnagInitializer";
    }

    @ReactMethod
    public void initializeWithEnvironment(String environment, Promise promise) {
        try {
            // Check if already initialized to prevent duplicate initialization
            if (isInitialized) {
                Log.d("BugsnagInitializer", "Bugsnag already initialized, skipping");
                promise.resolve("Bugsnag already initialized");
                return;
            }

            // Load Bugsnag API key from manifest
            String apiKey = null;
            try {
                ApplicationInfo appInfo = reactContext.getPackageManager().getApplicationInfo(reactContext.getPackageName(), PackageManager.GET_META_DATA);
                if (appInfo.metaData != null) {
                    apiKey = appInfo.metaData.getString("com.bugsnag.android.API_KEY");
                }
            } catch (PackageManager.NameNotFoundException e) {
                Log.e("BugsnagInitializer", "Could not load API key from manifest", e);
            }
            
            if (apiKey == null) {
                Log.w("BugsnagInitializer", "Bugsnag API key not found in manifest");
                promise.reject("NO_API_KEY", "Bugsnag API key not found in manifest");
                return;
            }

            // Configure Bugsnag with proper settings
            Configuration bugsnagConfig = new Configuration(apiKey);
            bugsnagConfig.setAutoDetectErrors(false);
            bugsnagConfig.setReleaseStage(environment);
            
            // Set enabled release stages
            Set<String> enabledStages = new HashSet<>(Arrays.asList("staging", "prod", "uat", "prerelease", "perf", "development"));
            bugsnagConfig.setEnabledReleaseStages(enabledStages);
            
            Bugsnag.start(reactContext.getApplicationContext(), bugsnagConfig);

            // Mark as initialized
            isInitialized = true;

            Log.d("BugsnagInitializer", "Bugsnag initialized successfully");
            Log.d("BugsnagInitializer", "Bugsnag release stage: " + environment);
            
            promise.resolve("Bugsnag initialized with environment: " + environment);
        } catch (Exception e) {
            Log.e("BugsnagInitializer", "Bugsnag initialization failed", e);
            promise.reject("INITIALIZATION_ERROR", "Bugsnag initialization failed", e);
        }
    }
}
