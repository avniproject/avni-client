package com.openchsclient

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
// PackageList not used - we use CustomPackageList for manual linking
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            // Use CustomPackageList - autolinking disabled, manual package selection
            val packages = CustomPackageList(this).packages.toMutableList()
            // Add TamperCheckPackage if available
            try {
                val aClass = Class.forName("com.openchsclient.TamperCheckPackage")
                val tamperCheckPackage = aClass.newInstance() as ReactPackage
                packages.add(tamperCheckPackage)
            } catch (e: Exception) {
                Log.i("MainApplication", e.toString())
            }
            return packages
        }

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

    override val reactHost: ReactHost?
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override val reactNativeHost: ReactNativeHost
        get() = mReactNativeHost

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        // New Architecture disabled for RN 0.81.4 manual linking
        // if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
        //     load()
        // }
        // Flipper initialization removed - deprecated in RN 0.81.4
    }

    override fun registerReceiver(receiver: BroadcastReceiver?, filter: IntentFilter): Intent? {
        return if (Build.VERSION.SDK_INT >= 34 && applicationInfo.targetSdkVersion >= 34) {
            super.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            super.registerReceiver(receiver, filter)
        }
    }
}
