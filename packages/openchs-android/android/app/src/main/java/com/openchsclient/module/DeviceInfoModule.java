package com.openchsclient.module;

import android.widget.Toast;
import android.os.Build;
import com.openchsclient.BuildConfig;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Map;
import java.util.HashMap;

public class DeviceInfoModule extends ReactContextBaseJavaModule {

    private static final String VERSION_NAME = "versionName";
    private static final String VERSION_CODE = "versionCode";
    private static final String DEVICE_NAME = "deviceName";
    private static final String RELEASE_VERSION = "releaseVersion";

    public DeviceInfoModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "DeviceInfo";
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put(VERSION_NAME, BuildConfig.VERSION_NAME);
        constants.put(VERSION_CODE, BuildConfig.VERSION_CODE);
        constants.put(DEVICE_NAME, getDeviceName());
        constants.put(RELEASE_VERSION, Build.VERSION.RELEASE);
        return constants;
    }

    public String getDeviceName() {
        String manufacturer = Build.MANUFACTURER;
        String model = Build.MODEL;
        if (model.toLowerCase().startsWith(manufacturer.toLowerCase())) {
            return capitalize(model);
        } else {
            return capitalize(manufacturer) + " " + model;
        }
    }

    private String capitalize(String s) {
        if (s == null || s.length() == 0) {
            return "";
        }
        char first = s.charAt(0);
        if (Character.isUpperCase(first)) {
            return s;
        } else {
            return Character.toUpperCase(first) + s.substring(1);
        }
    }
}