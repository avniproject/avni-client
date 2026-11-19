package com.openchsclient

import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise

// Kept out of ClinicHubWifiModule: React Native reads every method type of a module, and these types are missing below Android 8.
@RequiresApi(Build.VERSION_CODES.Q)
internal class ClinicHubHotspot(
    private val wifiManager: () -> WifiManager,
    private val handler: Handler,
    private val startFailureCode: () -> String,
    private val onStopped: (reason: String) -> Unit,
) {
    companion object {
        private const val TAG = "ClinicHubHotspot"

        @JvmStatic
        fun failureReason(reason: Int): String = when (reason) {
            WifiManager.LocalOnlyHotspotCallback.ERROR_NO_CHANNEL -> "no-channel"
            // The phone's own hotspot is on, or Wi-Fi is in a mode that cannot share.
            WifiManager.LocalOnlyHotspotCallback.ERROR_INCOMPATIBLE_MODE -> "incompatible-mode"
            WifiManager.LocalOnlyHotspotCallback.ERROR_TETHERING_DISALLOWED -> "tethering-disallowed"
            WifiManager.LocalOnlyHotspotCallback.ERROR_GENERIC -> "generic"
            else -> "unknown-$reason"
        }
    }

    private val lifecycle = HotspotLifecycle()
    private val starts = HashMap<Int, Promise>()
    private var reservation: WifiManager.LocalOnlyHotspotReservation? = null

    fun start(promise: Promise) {
        val id = lifecycle.begin()
        if (id == null) {
            promise.reject(ClinicHubWifiModule.E_HOTSPOT, "The hotspot is already starting")
            return
        }
        closeReservation()
        starts[id] = promise
        try {
            wifiManager().startLocalOnlyHotspot(callback(id), handler)
        } catch (e: SecurityException) {
            lifecycle.failed(id)
            starts.remove(id)?.reject(startFailureCode(), e.message, e)
        } catch (e: IllegalStateException) {
            // Android allows one local-only hotspot request per app at a time.
            lifecycle.failed(id)
            starts.remove(id)?.reject(ClinicHubWifiModule.E_HOTSPOT, e.message, e)
        }
    }

    fun stop() {
        lifecycle.stop()?.let { waiting -> starts.remove(waiting)?.reject(ClinicHubWifiModule.E_CANCELLED, "The hub was stopped before its hotspot started") }
        closeReservation()
    }

    // A JS reload: nobody is left to tell about a start Android has not answered yet.
    fun release() {
        lifecycle.stop()
        starts.clear()
        closeReservation()
    }

    private fun callback(id: Int) = object : WifiManager.LocalOnlyHotspotCallback() {
        override fun onStarted(started: WifiManager.LocalOnlyHotspotReservation) {
            if (!lifecycle.started(id)) {
                // Stopped while Android was still starting it; its caller has already been told.
                started.close()
                return
            }
            reservation = started
            val (ssid, passphrase) = credentialsOf(started)
            val promise = starts.remove(id)
            if (ssid == null || passphrase == null) {
                lifecycle.stop()
                closeReservation()
                promise?.reject(ClinicHubWifiModule.E_HOTSPOT, "The hotspot started without a network name or password")
                return
            }
            promise?.resolve(Arguments.createMap().apply {
                putString("ssid", ssid)
                putString("passphrase", passphrase)
            })
        }

        // Closed, not just dropped: an unclosed reservation's finalizer later stops whatever hotspot or Wi-Fi state is live.
        override fun onStopped() {
            if (lifecycle.stopped(id)) {
                closeReservation()
                onStopped("stopped")
            }
        }

        override fun onFailed(reason: Int) {
            Log.w(TAG, "Hotspot failed: ${failureReason(reason)}")
            when (lifecycle.failed(id)) {
                HotspotLifecycle.OnFailed.REJECT_START ->
                    starts.remove(id)?.reject(ClinicHubWifiModule.E_HOTSPOT, "The hotspot could not start: ${failureReason(reason)}")
                // A hotspot that dies after starting, so the hub stops showing a code for a network that has gone.
                HotspotLifecycle.OnFailed.REPORT_STOPPED -> {
                    closeReservation()
                    onStopped(failureReason(reason))
                }
                HotspotLifecycle.OnFailed.IGNORE -> {}
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun credentialsOf(started: WifiManager.LocalOnlyHotspotReservation): Pair<String?, String?> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val config = started.softApConfiguration
            val ssid = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) ClinicHubWifiModule.unquoteSsid(config.wifiSsid?.toString()) else config.ssid
            Pair(ssid, config.passphrase)
        } else {
            val config = started.wifiConfiguration
            Pair(ClinicHubWifiModule.unquoteSsid(config?.SSID), config?.preSharedKey?.let { ClinicHubWifiModule.unquoteSsid(it) })
        }

    private fun closeReservation() {
        reservation?.close()
        reservation = null
    }
}
