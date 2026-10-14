package com.openchsclient;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.module.annotations.ReactModule;
import android.os.Build;
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
        // Processor identity for the telemetry `device_details` user property. Build.SOC_* only
        // exist from API 31 (Android 12); minSdk is 24, so older devices report "" and JS falls
        // back to Build.HARDWARE (DeviceInfo.getHardwareSync()).
        String socManufacturer = "";
        String socModel = "";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            socManufacturer = Build.SOC_MANUFACTURER == null ? "" : Build.SOC_MANUFACTURER;
            socModel = Build.SOC_MODEL == null ? "" : Build.SOC_MODEL;
        }
        constants.put("SOC_MANUFACTURER", socManufacturer);
        constants.put("SOC_MODEL", socModel);
        constants.put("CPU_CORES", Runtime.getRuntime().availableProcessors());
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
