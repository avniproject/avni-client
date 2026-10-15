package com.openchsclient.clinicsharing

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class ClinicHubModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    init {
        context = WeakReference(reactContext)
    }

    override fun getName() = "ClinicHub"

    @ReactMethod
    fun startForegroundService() {
        ContextCompat.startForegroundService(reactApplicationContext, Intent(reactApplicationContext, ClinicHubForegroundService::class.java))
    }

    @ReactMethod
    fun stopForegroundService() {
        reactApplicationContext.stopService(Intent(reactApplicationContext, ClinicHubForegroundService::class.java))
    }

    // Required by NativeEventEmitter.
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    companion object {
        private const val STOP_REQUESTED_EVENT = "ClinicHubStopRequested"
        private var context: WeakReference<ReactApplicationContext>? = null

        fun emitStopRequested() {
            context?.get()?.takeIf { it.hasActiveReactInstance() }
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(STOP_REQUESTED_EVENT, null)
        }
    }
}
