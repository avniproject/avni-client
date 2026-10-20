package com.openchsclient

import android.content.Context
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.wifi.SupplicantState
import android.net.wifi.WifiManager
import android.net.wifi.WifiNetworkSpecifier
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.net.Inet4Address

// Every method runs on the main thread, where Android's hotspot and network callbacks also run, so this state has one thread.
class ClinicHubWifiModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        // Android can send a joined network's addresses just after saying it is available.
        private const val GATEWAY_WAIT_MS = 3000L
        const val EVENT_NETWORK_LOST = "ClinicHubNetworkLost"
        const val EVENT_HOTSPOT_STOPPED = "ClinicHubHotspotStopped"
        const val E_UNSUPPORTED = "E_UNSUPPORTED"
        const val E_PERMISSION = "E_PERMISSION"
        const val E_LOCATION_OFF = "E_LOCATION_OFF"
        const val E_HOTSPOT = "E_HOTSPOT"
        const val E_JOIN = "E_JOIN"
        const val E_CANCELLED = "E_CANCELLED"

        /** Android quotes a readable network name, and says "<unknown ssid>" when it will not reveal it. */
        @JvmStatic
        fun unquoteSsid(raw: String?): String? {
            if (raw == null || raw == WifiManager.UNKNOWN_SSID) return null
            val name = if (raw.length >= 2 && raw.startsWith("\"") && raw.endsWith("\"")) raw.substring(1, raw.length - 1) else raw
            return name.ifEmpty { null }
        }

        /** Android 10 to 12 refuse a hotspot while location is switched off, even with the permission granted. */
        @JvmStatic
        fun startFailureCode(sdkInt: Int, locationEnabled: Boolean): String =
            if (sdkInt < Build.VERSION_CODES.TIRAMISU && !locationEnabled) E_LOCATION_OFF else E_PERMISSION

        /** DhcpInfo holds an IPv4 address as an int with its first byte lowest. */
        @JvmStatic
        fun dhcpAddress(address: Int): String? =
            if (address == 0) null else "${address and 0xff}.${(address shr 8) and 0xff}.${(address shr 16) and 0xff}.${(address ushr 24) and 0xff}"

        @JvmStatic
        fun gatewayOf(link: LinkProperties?): String? {
            if (link == null) return null
            link.routes.firstOrNull { it.isDefaultRoute && it.gateway is Inet4Address && !it.gateway!!.isAnyLocalAddress }
                ?.let { return it.gateway!!.hostAddress }
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) link.dhcpServerAddress?.hostAddress else null
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var hotspot: ClinicHubHotspot? = null
    private val joins = JoinLifecycle()
    private val joinCallbacks = HashMap<Int, ConnectivityManager.NetworkCallback>()
    private val joinPromises = HashMap<Int, Promise>()

    override fun getName(): String = "ClinicHubWifiModule"

    private fun wifiManager() = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    private fun connectivityManager() = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private fun locationEnabled(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.P ||
            (reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager).isLocationEnabled

    @ReactMethod
    fun startHotspot(promise: Promise) {
        mainHandler.post {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                promise.reject(E_UNSUPPORTED, "A hub needs Android 10 or later")
                return@post
            }
            hotspot().start(promise)
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun hotspot(): ClinicHubHotspot = hotspot ?: ClinicHubHotspot(
        ::wifiManager,
        mainHandler,
        { startFailureCode(Build.VERSION.SDK_INT, locationEnabled()) },
        ::emitHotspotStopped,
    ).also { hotspot = it }

    @ReactMethod
    fun stopHotspot(promise: Promise) {
        mainHandler.post {
            hotspot?.stop()
            promise.resolve(true)
        }
    }

    private fun emitHotspotStopped(reason: String) {
        emit(EVENT_HOTSPOT_STOPPED, Arguments.createMap().apply { putString("reason", reason) })
    }

    @ReactMethod
    fun joinNetwork(ssid: String, passphrase: String, timeoutMs: Double, promise: Promise) {
        mainHandler.post {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                promise.reject(E_UNSUPPORTED, "Joining from a QR code needs Android 10 or later")
                return@post
            }
            val (id, replaced) = joins.begin()
            replaced?.let { cancelJoin(it, "Replaced by a newer join") }
            val callback = joinCallback(id, ssid)
            joinPromises[id] = promise
            joinCallbacks[id] = callback
            try {
                // The builder throws for a name or password Wi-Fi cannot use, and a scanned code is untrusted.
                val request = NetworkRequest.Builder()
                    .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                    .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .setNetworkSpecifier(WifiNetworkSpecifier.Builder().setSsid(ssid).setWpa2Passphrase(passphrase).build())
                    .build()
                connectivityManager().requestNetwork(request, callback, mainHandler, timeoutMs.toInt())
            } catch (e: SecurityException) {
                failJoin(id, E_PERMISSION, e)
            } catch (e: RuntimeException) {
                failJoin(id, E_JOIN, e)
            }
        }
    }

    // The hub runs the hotspot, so the joined network's gateway is the hub's address.
    private fun joinCallback(id: Int, ssid: String) = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            val gateway = gatewayOf(connectivityManager().getLinkProperties(network))
            if (gateway != null) resolveJoin(id, ssid, gateway)
            else mainHandler.postDelayed({ resolveJoin(id, ssid, null) }, GATEWAY_WAIT_MS)
        }

        override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) {
            gatewayOf(linkProperties)?.let { resolveJoin(id, ssid, it) }
        }

        // The user declined Android's join prompt, or the network did not appear in time. Android drops the request.
        override fun onUnavailable() {
            joins.end(id)
            joinCallbacks.remove(id)
            joinPromises.remove(id)?.reject(E_JOIN, "Could not join $ssid")
        }

        override fun onLost(network: Network) {
            if (joins.isCurrent(id)) emit(EVENT_NETWORK_LOST, Arguments.createMap().apply { putString("ssid", ssid) })
        }
    }

    private fun resolveJoin(id: Int, ssid: String, gateway: String?) {
        joinPromises.remove(id)?.resolve(Arguments.createMap().apply {
            putString("ssid", ssid)
            putString("gateway", gateway)
        })
    }

    private fun failJoin(id: Int, code: String, e: Exception) {
        joins.end(id)
        joinCallbacks.remove(id)
        joinPromises.remove(id)?.reject(code, e.message, e)
    }

    // After unregistering, Android sends the callback nothing more, so its caller is told here.
    private fun cancelJoin(id: Int, message: String) {
        joinCallbacks.remove(id)?.let { unregister(it) }
        joinPromises.remove(id)?.reject(E_CANCELLED, message)
    }

    private fun unregister(callback: ConnectivityManager.NetworkCallback) {
        try {
            connectivityManager().unregisterNetworkCallback(callback)
        } catch (e: IllegalArgumentException) {
            // Already released by Android.
        }
    }

    @ReactMethod
    fun leaveNetwork(promise: Promise) {
        mainHandler.post {
            joins.leave()?.let { cancelJoin(it, "The join was cancelled") }
            promise.resolve(true)
        }
    }

    @ReactMethod
    @Suppress("DEPRECATION")
    fun currentSsid(promise: Promise) {
        try {
            promise.resolve(unquoteSsid(wifiManager().connectionInfo?.ssid))
        } catch (e: SecurityException) {
            promise.reject(E_PERMISSION, e.message, e)
        }
    }

    /** Below Android 10 an unknown name means either no Wi-Fi or a name Android will not reveal; this tells them apart. */
    @ReactMethod
    @Suppress("DEPRECATION")
    fun wifiConnected(promise: Promise) {
        try {
            promise.resolve(wifiManager().connectionInfo?.supplicantState == SupplicantState.COMPLETED)
        } catch (e: SecurityException) {
            promise.reject(E_PERMISSION, e.message, e)
        }
    }

    @ReactMethod
    @Suppress("DEPRECATION")
    fun wifiGateway(promise: Promise) {
        try {
            promise.resolve(dhcpAddress(wifiManager().dhcpInfo?.gateway ?: 0))
        } catch (e: SecurityException) {
            promise.reject(E_PERMISSION, e.message, e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun emit(event: String, params: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, params)
    }

    // A JS reload: let go of the hotspot and the joined network, including a start Android has not answered yet.
    override fun invalidate() {
        mainHandler.post {
            hotspot?.release()
            joins.leave()
            joinCallbacks.values.forEach { unregister(it) }
            joinCallbacks.clear()
            joinPromises.clear()
        }
        super.invalidate()
    }
}
