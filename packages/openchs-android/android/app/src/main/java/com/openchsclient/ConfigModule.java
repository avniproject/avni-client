package com.openchsclient;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import android.util.Log;
import java.util.HashMap;
import java.util.Map;

@ReactModule(name = "ConfigModule")
public class ConfigModule extends ReactContextBaseJavaModule {

    private static String envValue = "development"; // default value

    public ConfigModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ConfigModule";
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("BUILD_TYPE", BuildConfig.BUILD_TYPE);
        constants.put("IS_PRODUCTION_BUILD", BuildConfig.BUILD_TYPE.equals("release"));
        return constants;
    }

    @ReactMethod
    public void setEnvironment(String env, Promise promise) {
        try {
            envValue = env;
            Log.d("ConfigModule", "Environment set to: " + env);
            promise.resolve("Environment set to: " + env);
        } catch (Exception e) {
            promise.reject("CONFIG_ERROR", "Failed to set environment", e);
        }
    }

    @ReactMethod
    public void getBuildType(Promise promise) {
        try {
            promise.resolve(BuildConfig.BUILD_TYPE);
        } catch (Exception e) {
            promise.reject("CONFIG_ERROR", "Failed to get build type", e);
        }
    }

    public static String getEnvironment() {
        return envValue;
    }
}
