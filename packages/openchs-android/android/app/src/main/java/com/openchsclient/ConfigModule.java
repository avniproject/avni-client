package com.openchsclient;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import android.util.Log;

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

    public static String getEnvironment() {
        return envValue;
    }
}
