package com.openchsclient.anupath

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

/**
 * React Native bridge for the anuPath nano (PathShodh) BLE meter.
 *
 * JS API (NativeModules.AnuPathModule), all promise-based:
 *   isSupported(), isBluetoothEnabled(), requestEnableBluetooth()
 *   startScan(timeoutMs)  -> emits "AnuPathDeviceFound" {address, name, rssi}, then "AnuPathScanStopped"
 *   stopScan()
 *   connect(address)      -> resolves {address, manufacturer, model, firmware, software} once ready
 *                            (notifications on, clock synced, Device Information read)
 *   disconnect()
 *   getLastRecord()       -> newest stored result, or null when the meter has none
 *   getRecord(id)         -> result in slot id (0-999), or null when the slot is empty / past the newest
 * Events: "AnuPathConnectionState" {state, detail, address}
 *         "AnuPathRecordPushed" {record}  (a test finished while connected)
 * A record is {sequence, testName, value, unit, dateTime, testedAt (epoch ms or null)}.
 *
 * Callers must hold BLUETOOTH_SCAN / BLUETOOTH_CONNECT (Android 12+) or location (Android 11-).
 * Everything runs on the main thread; the GATT work is in [AnuPathGattClient].
 */
@SuppressLint("MissingPermission")
class AnuPathModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), AnuPathGattClient.Listener {

    override fun getName(): String = NAME

    private val main = Handler(Looper.getMainLooper())
    private val client = AnuPathGattClient(reactContext.applicationContext, this)

    private val adapter: BluetoothAdapter?
        get() = (reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    // ---------------------------------------------------------------- connection state

    private val deviceInfo = mutableMapOf<String, String>()
    private var connectedAddress: String? = null
    private var connectPromise: Promise? = null
    private val connectTimeout = Runnable {
        failConnect("TIMEOUT", "Could not connect to the meter. Make sure it is switched on and nearby.")
        client.close()
    }

    // ---------------------------------------------------------------- command / response

    private class PendingCommand(val bytes: ByteArray, val promise: Promise, var retriesLeft: Int)

    private var pending: PendingCommand? = null
    private val fields = mutableMapOf<UUID, String>()
    private val commandTimeout = Runnable { onCommandTimeout() }

    // ---------------------------------------------------------------- scanning

    private var scanning = false
    private val scanStop = Runnable { stopScanInternal() }
    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val name = result.scanRecord?.deviceName ?: try {
                result.device.name
            } catch (e: SecurityException) {
                null
            }
            if (name?.contains(AnuPathProtocol.DEVICE_NAME, ignoreCase = true) != true) return
            emit(EVENT_DEVICE_FOUND, Arguments.createMap().apply {
                putString("address", result.device.address)
                putString("name", name)
                putInt("rssi", result.rssi)
            })
        }

        override fun onScanFailed(errorCode: Int) {
            scanning = false
            emit(EVENT_SCAN_STOPPED, Arguments.createMap().apply { putInt("errorCode", errorCode) })
        }
    }

    // Required by NativeEventEmitter.
    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Double) {
    }

    @ReactMethod
    fun isSupported(promise: Promise) {
        promise.resolve(adapter != null && reactContext.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE))
    }

    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        promise.resolve(adapter?.isEnabled == true)
    }

    /** Shows the system "turn on Bluetooth" prompt; JS checks isBluetoothEnabled() afterwards. */
    @ReactMethod
    fun requestEnableBluetooth(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity")
            return
        }
        try {
            activity.startActivity(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ENABLE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun startScan(timeoutMs: Double, promise: Promise) {
        main.post {
            val a = adapter
            if (a == null || !a.isEnabled) {
                promise.reject("BLUETOOTH_OFF", "Bluetooth is off")
                return@post
            }
            val scanner = a.bluetoothLeScanner
            if (scanner == null) {
                promise.reject("BLUETOOTH_OFF", "Bluetooth scanner unavailable")
                return@post
            }
            stopScanInternal()
            try {
                val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
                scanner.startScan(null, settings, scanCallback)
                scanning = true
                main.postDelayed(scanStop, timeoutMs.toLong().coerceIn(2_000L, 60_000L))
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SCAN_FAILED", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stopScan(promise: Promise) {
        main.post {
            stopScanInternal()
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun connect(address: String, promise: Promise) {
        main.post {
            val a = adapter
            if (a == null || !a.isEnabled) {
                promise.reject("BLUETOOTH_OFF", "Bluetooth is off")
                return@post
            }
            stopScanInternal()
            failConnect("CANCELLED", "A new connection was started")
            rejectPending("CANCELLED", "A new connection was started")
            val device = try {
                a.getRemoteDevice(address)
            } catch (e: IllegalArgumentException) {
                promise.reject("BAD_ADDRESS", "Invalid device address $address")
                return@post
            }
            // Close any previous link first: its DISCONNECTED event must not reject this new connect.
            client.close()
            deviceInfo.clear()
            fields.clear()
            connectedAddress = device.address
            connectPromise = promise
            main.postDelayed(connectTimeout, CONNECT_TIMEOUT_MS)
            client.connect(device)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        main.post {
            stopScanInternal()
            failConnect("CANCELLED", "Disconnected")
            rejectPending("DISCONNECTED", "Disconnected")
            client.close()
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun getLastRecord(promise: Promise) = sendCommand(AnuPathProtocol.CMD_LAST_RECORD, promise)

    @ReactMethod
    fun getRecord(id: Double, promise: Promise) {
        val recordId = id.toInt()
        if (recordId !in AnuPathProtocol.MIN_RECORD_ID..AnuPathProtocol.MAX_RECORD_ID) {
            promise.resolve(null)
            return
        }
        sendCommand(AnuPathProtocol.requestRecord(recordId), promise)
    }

    override fun invalidate() {
        main.post {
            stopScanInternal()
            client.close()
        }
        super.invalidate()
    }

    // ---------------------------------------------------------------- internals

    private fun stopScanInternal() {
        main.removeCallbacks(scanStop)
        if (!scanning) return
        scanning = false
        try {
            adapter?.bluetoothLeScanner?.stopScan(scanCallback)
        } catch (e: Exception) {
            Log.w(TAG, "stopScan failed", e)
        }
        emit(EVENT_SCAN_STOPPED, Arguments.createMap())
    }

    private fun sendCommand(bytes: ByteArray, promise: Promise) {
        main.post {
            if (client.state != AnuPathGattClient.State.READY) {
                promise.reject("NOT_CONNECTED", "The meter is not connected")
                return@post
            }
            if (pending != null) {
                promise.reject("BUSY", "Another request is in progress")
                return@post
            }
            pending = PendingCommand(bytes, promise, COMMAND_RETRIES)
            writeCommand(bytes, freshReply = true)
        }
    }

    // A new command starts with no fields. A retry keeps what already arrived from the first attempt (a slow
    // reply may still complete it), so the record is not rebuilt from half a reply.
    private fun writeCommand(bytes: ByteArray, freshReply: Boolean) {
        if (freshReply) fields.clear()
        client.write(AnuPathProtocol.DATA_CONTROL, bytes, "command")
        main.removeCallbacks(commandTimeout)
        main.postDelayed(commandTimeout, COMMAND_TIMEOUT_MS)
    }

    // Guide V2.0 §9: wait ~3 s for the Status after a command, retry once.
    private fun onCommandTimeout() {
        val p = pending ?: return
        if (p.retriesLeft > 0 && client.state == AnuPathGattClient.State.READY) {
            p.retriesLeft--
            writeCommand(p.bytes, freshReply = false)
            return
        }
        pending = null
        fields.clear()
        p.promise.reject("TIMEOUT", "No reply from the meter")
    }

    private fun rejectPending(code: String, message: String) {
        main.removeCallbacks(commandTimeout)
        val p = pending ?: return
        pending = null
        fields.clear()
        p.promise.reject(code, message)
    }

    private fun failConnect(code: String, message: String) {
        main.removeCallbacks(connectTimeout)
        val p = connectPromise ?: return
        connectPromise = null
        p.reject(code, message)
    }

    private fun recordMap(): WritableMap = Arguments.createMap().apply {
        val sequence = fields[AnuPathProtocol.TEST_SEQUENCE]?.toIntOrNull()
        if (sequence != null) putInt("sequence", sequence) else putNull("sequence")
        putString("testName", fields[AnuPathProtocol.TEST_NAME] ?: "")
        putString("value", fields[AnuPathProtocol.TEST_VALUE] ?: "")
        putString("unit", fields[AnuPathProtocol.TEST_UNIT] ?: "")
        val dateTime = fields[AnuPathProtocol.TEST_DATE_TIME] ?: ""
        putString("dateTime", dateTime)
        val testedAt = AnuPathProtocol.parseTestDateTime(dateTime)
        if (testedAt != null) putDouble("testedAt", testedAt.toDouble()) else putNull("testedAt")
    }

    private fun deviceInfoMap(): WritableMap = Arguments.createMap().apply {
        putString("address", connectedAddress)
        putString("manufacturer", deviceInfo["manufacturer"])
        putString("model", deviceInfo["model"])
        putString("firmware", deviceInfo["firmware"])
        putString("software", deviceInfo["software"])
    }

    private fun emit(event: String, params: WritableMap) {
        if (!reactContext.hasActiveReactInstance()) return
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, params)
    }

    // ---------------------------------------------------------------- AnuPathGattClient.Listener (main thread)

    override fun onStateChanged(state: AnuPathGattClient.State, detail: String) {
        emit(EVENT_CONNECTION_STATE, Arguments.createMap().apply {
            putString("state", state.name)
            putString("detail", detail)
            putString("address", connectedAddress)
        })
        when (state) {
            AnuPathGattClient.State.READY -> {
                main.removeCallbacks(connectTimeout)
                connectPromise?.resolve(deviceInfoMap())
                connectPromise = null
            }
            AnuPathGattClient.State.DISCONNECTED -> {
                failConnect("CONNECT_FAILED", detail)
                rejectPending("DISCONNECTED", "The meter disconnected")
            }
            else -> Unit
        }
    }

    override fun onValue(uuid: UUID, value: ByteArray, source: AnuPathGattClient.Source) {
        val text = AnuPathProtocol.decodeString(value)
        when (uuid) {
            AnuPathProtocol.MANUFACTURER_NAME -> deviceInfo["manufacturer"] = text
            AnuPathProtocol.MODEL_NUMBER -> deviceInfo["model"] = text
            AnuPathProtocol.FIRMWARE_REVISION -> deviceInfo["firmware"] = text
            AnuPathProtocol.SOFTWARE_REVISION -> deviceInfo["software"] = text
            AnuPathProtocol.TEST_SEQUENCE, AnuPathProtocol.TEST_NAME,
            AnuPathProtocol.TEST_VALUE, AnuPathProtocol.TEST_UNIT -> fields[uuid] = text
            AnuPathProtocol.TEST_DATE_TIME -> {
                fields[uuid] = text
                // Guide V2.0 §6.6: a test finished while connected is pushed unasked; its Status may
                // repeat an old text, so the record is taken as soon as its date-time arrives.
                if (pending == null && source == AnuPathGattClient.Source.NOTIFY && hasCompleteRecord()) {
                    emit(EVENT_RECORD_PUSHED, Arguments.createMap().apply { putMap("record", recordMap()) })
                    fields.clear()
                }
            }
            AnuPathProtocol.STATUS -> onStatus(text)
            else -> Unit
        }
    }

    private fun onStatus(status: String) {
        val p = pending
        if (p == null) {
            fields.clear()
            return
        }
        main.removeCallbacks(commandTimeout)
        pending = null
        val receivedAny = RECORD_FIELDS.any { fields.containsKey(it) }
        when {
            // Resolved only with every record field present: a partial reply must not look like a record
            // with an empty name or value (or like "no record").
            status == AnuPathProtocol.STATUS_OK && hasCompleteRecord() -> p.promise.resolve(recordMap())
            status == AnuPathProtocol.STATUS_OK && receivedAny ->
                p.promise.reject("INCOMPLETE_RECORD", "The meter's reply was incomplete. Please try again.")
            status == AnuPathProtocol.STATUS_OK ||
                status == AnuPathProtocol.STATUS_NO_RECORD ||
                status == AnuPathProtocol.STATUS_INVALID_COUNT -> p.promise.resolve(null)
            else -> p.promise.reject(status, "The meter replied $status")
        }
        fields.clear()
    }

    private fun hasCompleteRecord() = RECORD_FIELDS.all { fields.containsKey(it) }

    override fun onLog(message: String) {
        Log.d(TAG, message)
    }

    companion object {
        const val NAME = "AnuPathModule"
        private const val TAG = "AnuPathModule"
        private const val EVENT_DEVICE_FOUND = "AnuPathDeviceFound"
        private const val EVENT_SCAN_STOPPED = "AnuPathScanStopped"
        private const val EVENT_CONNECTION_STATE = "AnuPathConnectionState"
        private const val EVENT_RECORD_PUSHED = "AnuPathRecordPushed"
        private const val CONNECT_TIMEOUT_MS = 20_000L
        private const val COMMAND_TIMEOUT_MS = 3_500L
        private const val COMMAND_RETRIES = 1
        // The five notifications that make up one record (the Status follows them).
        private val RECORD_FIELDS = listOf(
            AnuPathProtocol.TEST_SEQUENCE, AnuPathProtocol.TEST_NAME, AnuPathProtocol.TEST_VALUE,
            AnuPathProtocol.TEST_UNIT, AnuPathProtocol.TEST_DATE_TIME
        )
    }
}
