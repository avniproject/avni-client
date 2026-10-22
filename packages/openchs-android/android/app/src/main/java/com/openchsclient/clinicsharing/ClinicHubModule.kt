package com.openchsclient.clinicsharing

import android.content.Intent
import android.util.Log
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
    fun startForegroundService(role: String) {
        val intent = Intent(reactApplicationContext, ClinicHubForegroundService::class.java).putExtra(ClinicHubForegroundService.EXTRA_ROLE, role)
        // Set here, not when the service starts, so a stop that follows at once still matches.
        ClinicHubForegroundService.runningRole = role
        try {
            ContextCompat.startForegroundService(reactApplicationContext, intent)
        } catch (e: IllegalStateException) {
            // Android 12+ refuses a start from the background, e.g. a join that finished after the person left Avni; sharing works without it.
            ClinicHubForegroundService.runningRole = null
            Log.w("ClinicHubModule", "Could not start the clinic service: ${e.message}")
        }
    }

    // Only the role that started the service stops it, so a joined phone's clean-up never stops a hub.
    @ReactMethod
    fun stopForegroundService(role: String) {
        if (ClinicHubForegroundService.runningRole != role) return
        ClinicHubForegroundService.runningRole = null
        reactApplicationContext.stopService(Intent(reactApplicationContext, ClinicHubForegroundService::class.java))
    }

    // Required by NativeEventEmitter.
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    companion object {
        private const val STOP_REQUESTED_EVENT = "ClinicHubStopRequested"
        private const val LEAVE_REQUESTED_EVENT = "ClinicPhoneLeaveRequested"
        private var context: WeakReference<ReactApplicationContext>? = null

        fun emitStopRequested(role: String) {
            context?.get()?.takeIf { it.hasActiveReactInstance() }
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(if (role == ClinicHubForegroundService.ROLE_PHONE) LEAVE_REQUESTED_EVENT else STOP_REQUESTED_EVENT, null)
        }
    }
}
