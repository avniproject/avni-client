package com.openchsclient;

import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.util.Log;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "Avni";
    }

    /**
     * Custom ReactActivityDelegate that handles React Native 0.81.4 feature flags issue
     * Catches libreact_featureflagsjni.so UnsatisfiedLinkError and continues without feature flags
     */
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(this, getMainComponentName(), false) {
            @Override
            public void onCreate(Bundle savedInstanceState) {
                try {
                    super.onCreate(savedInstanceState);
                } catch (UnsatisfiedLinkError e) {
                    if (e.getMessage() != null && e.getMessage().contains("libreact_featureflagsjni.so")) {
                        Log.w("MainActivity", "React Native feature flags library not available - continuing without feature flags");
                        // Initialize React Native without feature flags
                        // We need to do minimal initialization that super.onCreate() would do
                        try {
                            // Try to initialize ReactNativeHost and handle Hermes loading issues
                            Log.i("MainActivity", "Attempting React Native initialization without feature flags");

                            // First try to get ReactNativeHost - this may fail if Hermes can't load
                            if (getReactNativeHost() != null) {
                                try {
                                    // Try to get ReactInstanceManager - this triggers Hermes loading
                                    if (getReactNativeHost().getReactInstanceManager() != null) {
                                        loadApp(getMainComponentName());
                                        Log.i("MainActivity", "Successfully initialized React Native with standard path");
                                    } else {
                                        Log.w("MainActivity", "ReactInstanceManager is null - initialization failed");
                                        throw new RuntimeException("ReactInstanceManager initialization failed");
                                    }
                                } catch (Exception hermes_ex) {
                                    Log.w("MainActivity", "ReactInstanceManager creation failed (likely Hermes issue): " + hermes_ex.getMessage());
                                    // For now, we'll still throw the exception until we implement JSC fallback
                                    throw hermes_ex;
                                }
                            } else {
                                Log.e("MainActivity", "ReactNativeHost is null");
                                throw new RuntimeException("ReactNativeHost initialization failed");
                            }
                        } catch (Exception ex) {
                            Log.e("MainActivity", "Failed to load app without feature flags", ex);
                            throw ex;
                        }
                    } else {
                        throw e;
                    }
                }
            }
        };
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        this.sendBroadcast(intent);
    }
}
