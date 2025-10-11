package com.openchsclient

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

    companion object {
        private const val TAG = "MainApplication"
        
        // Static initializer - runs when class is loaded
        init {
            try {
                android.util.Log.i(TAG, "MainApplication class loading - SoLoader initialization")
            } catch (e: Exception) {
                android.util.Log.e(TAG, "Error in static init: ${e.message}")
            }
        }
    }

    private val mReactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            return PackageList(this).packages
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }
        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost

    override fun onCreate() {
        super.onCreate()
        android.util.Log.i(TAG, "MainApplication onCreate")
        SoLoader.init(this, false)

        SoLoaderFix.preloadLibraries()
        
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load()
        }
    }
}
