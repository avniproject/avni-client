package com.openchsclient.anupath

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.UUID

/**
 * Minimal GATT client for the anuPath nano (ported from the TANUHDemo POC, field-tested on PS-AN002-01 fw 10.0.0).
 *
 * Android allows only ONE outstanding GATT operation at a time (a second write issued before the
 * first callback silently fails), so every read / write / descriptor write / MTU request goes
 * through a FIFO queue that advances on the matching callback (or a timeout).
 *
 * All GATT callbacks arrive on a binder thread; they are re-posted to the main thread, so the
 * queue and the [Listener] are only ever touched on the main thread.
 *
 * Callers must hold BLUETOOTH_CONNECT (API 31+) before calling [connect] / [write] / [read].
 */
@SuppressLint("MissingPermission")
@Suppress("DEPRECATION") // pre-API-33 GATT write/value APIs are used on older devices
class AnuPathGattClient(
    private val context: Context,
    private val listener: Listener,
) {
    enum class State { DISCONNECTED, CONNECTING, DISCOVERING, CONFIGURING, READY }

    enum class Source { NOTIFY, READ }

    interface Listener {
        fun onStateChanged(state: State, detail: String)
        fun onValue(uuid: UUID, value: ByteArray, source: Source)
        fun onLog(message: String)
    }

    private sealed class Op {
        abstract val label: String

        data class EnableNotify(val uuid: UUID) : Op() {
            override val label get() = "enable notify ${AnuPathProtocol.nameOf(uuid)}"
        }

        data class Read(val uuid: UUID, val service: UUID = AnuPathProtocol.SERVICE) : Op() {
            override val label get() = "read ${AnuPathProtocol.nameOf(uuid)}"
        }

        class Write(val uuid: UUID, val bytes: ByteArray, val description: String) : Op() {
            override val label get() = "write ${AnuPathProtocol.nameOf(uuid)} ($description)"
        }

        data class RequestMtu(val mtu: Int) : Op() {
            override val label get() = "request MTU $mtu"
        }

        /** Runs a callback in queue order (used to signal "setup finished"). */
        class Marker(val action: () -> Unit) : Op() {
            override val label get() = "marker"
        }
    }

    private val main = Handler(Looper.getMainLooper())
    private val queue = ArrayDeque<Op>()
    private var current: Op? = null
    private var gatt: BluetoothGatt? = null
    private var deviceAddress: String? = null

    /** Setup (notifications, clock, auto-sync) must run once per connection — see onServicesDiscovered. */
    private var setupDone = false
    private var discoveryRetries = 0

    var state: State = State.DISCONNECTED
        private set

    private val opTimeout = Runnable {
        current?.let { log("Timeout: ${it.label}") }
        completeCurrent()
    }

    fun connect(device: BluetoothDevice) {
        close()
        deviceAddress = device.address
        setupDone = false
        discoveryRetries = 0
        setState(State.CONNECTING, "Connecting to ${device.address}")
        gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
        } else {
            device.connectGatt(context, false, callback)
        }
    }

    /** Disconnects and releases the GATT client. Safe to call repeatedly. */
    fun close(detail: String = "Disconnected") {
        main.removeCallbacks(opTimeout)
        queue.clear()
        current = null
        gatt?.let {
            it.disconnect()
            it.close()
        }
        val wasConnected = gatt != null
        gatt = null
        if (wasConnected) setState(State.DISCONNECTED, detail)
    }

    fun write(uuid: UUID, bytes: ByteArray, description: String) =
        enqueue(Op.Write(uuid, bytes, description))

    fun read(uuid: UUID) = enqueue(Op.Read(uuid))

    // ---------------------------------------------------------------- queue

    private fun enqueue(op: Op) {
        if (gatt == null) {
            log("Not connected; dropped ${op.label}")
            return
        }
        queue.addLast(op)
        if (current == null) next()
    }

    private fun next() {
        main.removeCallbacks(opTimeout)
        val g = gatt ?: return
        val op = queue.removeFirstOrNull() ?: run { current = null; return }
        current = op
        val started = when (op) {
            is Op.Marker -> { op.action(); false }
            is Op.RequestMtu -> g.requestMtu(op.mtu)
            is Op.EnableNotify -> startEnableNotify(g, op.uuid)
            is Op.Read -> characteristic(op.uuid, op.service)?.let { g.readCharacteristic(it) } ?: false
            is Op.Write -> startWrite(g, op)
        }
        if (started) {
            main.postDelayed(opTimeout, OP_TIMEOUT_MS)
        } else {
            if (op !is Op.Marker) log("Could not start: ${op.label}")
            current = null
            next()
        }
    }

    private fun completeCurrent() {
        main.removeCallbacks(opTimeout)
        current = null
        next()
    }

    // A callback completes the queue only when it answers the operation in progress. A late callback for an
    // operation that already timed out (or an MTU change the meter starts on its own) must not complete the
    // next operation in the queue.
    private fun completeIf(matches: (Op) -> Boolean, what: String) {
        val op = current
        if (op != null && matches(op)) completeCurrent() else log("Ignored callback ($what): not the operation in progress")
    }

    private fun startEnableNotify(g: BluetoothGatt, uuid: UUID): Boolean {
        val c = characteristic(uuid) ?: return false
        if (!g.setCharacteristicNotification(c, true)) return false
        val cccd = c.getDescriptor(AnuPathProtocol.CCCD) ?: run {
            log("${AnuPathProtocol.nameOf(uuid)} has no CCCD; local notify flag set only")
            return false
        }
        val value = if (c.properties and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0 &&
            c.properties and BluetoothGattCharacteristic.PROPERTY_NOTIFY == 0
        ) {
            BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
        } else {
            BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        }
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            g.writeDescriptor(cccd, value) == BluetoothGatt.GATT_SUCCESS
        } else {
            cccd.value = value
            g.writeDescriptor(cccd)
        }
    }

    private fun startWrite(g: BluetoothGatt, op: Op.Write): Boolean {
        val c = characteristic(op.uuid) ?: return false
        val writeType = if (c.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0) {
            BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        } else {
            BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        }
        log("→ ${AnuPathProtocol.nameOf(op.uuid)}: ${op.description} [${AnuPathProtocol.toHex(op.bytes)}]")
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            g.writeCharacteristic(c, op.bytes, writeType) == BluetoothGatt.GATT_SUCCESS
        } else {
            c.writeType = writeType
            c.value = op.bytes
            g.writeCharacteristic(c)
        }
    }

    private fun characteristic(uuid: UUID, service: UUID = AnuPathProtocol.SERVICE): BluetoothGattCharacteristic? {
        val c = gatt?.getService(service)?.getCharacteristic(uuid)
        if (c == null) log("Characteristic not found: ${AnuPathProtocol.nameOf(uuid)}")
        return c
    }

    // ---------------------------------------------------------------- setup after discovery

    private fun onServicesReady(g: BluetoothGatt) {
        val service = g.getService(AnuPathProtocol.SERVICE)
        if (service == null) {
            val found = g.services.joinToString { it.uuid.toString() }
            log("anuPath service ${AnuPathProtocol.SERVICE} not found. Services: $found")
            close("Not an anuPath device (service missing)")
            return
        }
        service.characteristics.forEach {
            log("  char ${AnuPathProtocol.nameOf(it.uuid)} props=0x${"%02X".format(it.properties)}")
        }
        setState(State.CONFIGURING, "Enabling notifications")
        // Strings are short, but a larger MTU avoids truncation of longer status messages.
        enqueue(Op.RequestMtu(PREFERRED_MTU))
        // Guide V2.0 §5.2: notifications on the six record/status characteristics are mandatory.
        // Data Control's Notify, Test Device (reserved) and Record Data (internal) are not used.
        AnuPathProtocol.NOTIFY_CHARACTERISTICS
            .filter { service.getCharacteristic(it) != null }
            .forEach { enqueue(Op.EnableNotify(it)) }
        // Guide V2.0 §6.7: set the date and time on every connection.
        enqueue(Op.Write(AnuPathProtocol.SET_DATE_TIME, AnuPathProtocol.dateTimePayload(), "sync clock"))
        // Guide V2.0 §5.4: model and firmware version from the standard Device Information service.
        g.getService(AnuPathProtocol.DEVICE_INFO_SERVICE)?.let { dis ->
            AnuPathProtocol.DEVICE_INFO_CHARACTERISTICS
                .filter { dis.getCharacteristic(it) != null }
                .forEach { enqueue(Op.Read(it, AnuPathProtocol.DEVICE_INFO_SERVICE)) }
        } ?: log("Device Information service not found")
        enqueue(Op.Marker { setState(State.READY, "Connected to $deviceAddress") })
    }

    // ---------------------------------------------------------------- callbacks (binder thread)

    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            main.post {
                if (g != gatt) return@post // stale callback from a previous connection
                if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
                    setState(State.DISCOVERING, "Discovering services")
                    // Short delay improves discovery reliability on several Android stacks.
                    main.postDelayed({ gatt?.discoverServices() }, 300)
                } else {
                    log("Connection state=$newState status=$status${if (status == 133) " (GATT_ERROR – retry)" else ""}")
                    main.removeCallbacks(opTimeout)
                    queue.clear()
                    current = null
                    g.close()
                    gatt = null
                    setState(State.DISCONNECTED, "Disconnected (status $status)")
                }
            }
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
            main.post {
                if (g != gatt) return@post
                // Field finding: the device can trigger a second discovery on the same connection
                // (Service Changed), sometimes with an empty service list. Re-running setup then
                // duplicated notifications/auto-sync, and the empty list looked like "not anuPath".
                if (setupDone) {
                    log("Services re-discovered (status $status); setup already done, ignoring")
                    return@post
                }
                if (status == BluetoothGatt.GATT_SUCCESS && g.getService(AnuPathProtocol.SERVICE) == null &&
                    discoveryRetries < MAX_DISCOVERY_RETRIES
                ) {
                    discoveryRetries++
                    log("Service list incomplete (${g.services.size} services); rediscovering ($discoveryRetries)")
                    main.postDelayed({ gatt?.discoverServices() }, 600)
                    return@post
                }
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    setupDone = true
                    onServicesReady(g)
                } else {
                    log("Service discovery failed: status=$status")
                    close()
                }
            }
        }

        override fun onMtuChanged(g: BluetoothGatt, mtu: Int, status: Int) {
            main.post {
                if (g != gatt) return@post
                log("MTU=$mtu (status $status)")
                completeIf({ it is Op.RequestMtu }, "MTU")
            }
        }

        override fun onDescriptorWrite(g: BluetoothGatt, d: BluetoothGattDescriptor, status: Int) {
            main.post {
                if (g != gatt) return@post
                log("Notify ${AnuPathProtocol.nameOf(d.characteristic.uuid)}: ${if (status == 0) "on" else "failed ($status)"}")
                completeIf({ it is Op.EnableNotify && it.uuid == d.characteristic.uuid }, "descriptor write")
            }
        }

        override fun onCharacteristicWrite(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
            main.post {
                if (g != gatt) return@post
                log("Write ${AnuPathProtocol.nameOf(c.uuid)}: ${if (status == 0) "ok" else "failed ($status)"}")
                completeIf({ it is Op.Write && it.uuid == c.uuid }, "write")
            }
        }

        // API 33+
        override fun onCharacteristicRead(
            g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray, status: Int,
        ) = deliverRead(g, c.uuid, value.copyOf(), status)

        @Deprecated("Deprecated in API 33")
        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
            deliverRead(g, c.uuid, c.value?.copyOf() ?: ByteArray(0), status)
        }

        // API 33+
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) =
            deliverNotify(g, c.uuid, value.copyOf())

        @Deprecated("Deprecated in API 33")
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
            // The deprecated buffer is shared and overwritten by the next notification: copy now.
            deliverNotify(g, c.uuid, c.value?.copyOf() ?: ByteArray(0))
        }
    }

    // Every callback carries the BluetoothGatt it came from: one from a previous connection (e.g. meter A,
    // after "Choose a different meter" switched to meter B) is dropped, so its values never reach the
    // listener as if they came from the current meter.
    private fun deliverRead(g: BluetoothGatt, uuid: UUID, value: ByteArray, status: Int) {
        main.post {
            if (g != gatt) return@post
            if (status == BluetoothGatt.GATT_SUCCESS) listener.onValue(uuid, value, Source.READ)
            else log("Read ${AnuPathProtocol.nameOf(uuid)} failed ($status)")
            completeIf({ it is Op.Read && it.uuid == uuid }, "read")
        }
    }

    private fun deliverNotify(g: BluetoothGatt, uuid: UUID, value: ByteArray) {
        main.post { if (g == gatt) listener.onValue(uuid, value, Source.NOTIFY) }
    }

    private fun setState(newState: State, detail: String) {
        state = newState
        Log.i(TAG, "State $newState: $detail")
        listener.onStateChanged(newState, detail)
    }

    private fun log(message: String) {
        Log.d(TAG, message)
        listener.onLog(message)
    }

    companion object {
        private const val TAG = "AnuPathBle"
        private const val OP_TIMEOUT_MS = 5_000L
        private const val PREFERRED_MTU = 247
        private const val MAX_DISCOVERY_RETRIES = 2
    }
}
