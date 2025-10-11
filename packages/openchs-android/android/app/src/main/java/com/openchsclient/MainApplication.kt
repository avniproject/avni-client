package com.openchsclient

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

/**
 * React Native 0.79.2 MainApplication
 * Note: ReactHost and loadReactNative() are RN 0.81+ APIs, not available in 0.79.2
 */
class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            // Auto-linking enabled - React Native handles all package registration
            return PackageList(this).packages
        }

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost

    override fun onCreate() {
        super.onCreate()
        
        // STEP 1: Initialize SoLoader first
        SoLoader.init(this, false)
        
        // Preload Hermes libraries before React Native initializes
        SoLoaderFix.preloadLibraries()
        
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // Load new architecture entry point if enabled
            com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load()
        }
    }

    override fun registerReceiver(receiver: BroadcastReceiver?, filter: IntentFilter): Intent? {
        return if (Build.VERSION.SDK_INT >= 34 && applicationInfo.targetSdkVersion >= 34) {
            super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            super.registerReceiver(receiver, filter)
        }
    }
}
