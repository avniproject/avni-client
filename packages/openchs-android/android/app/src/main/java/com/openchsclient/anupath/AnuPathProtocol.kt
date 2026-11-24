package com.openchsclient.anupath

import java.nio.charset.StandardCharsets
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * anuPath nano BLE protocol, per "Device Integration Guide V2.0" (PathShodh) and field testing on
 * PS-AN002-01 firmware 10.0.0. No pairing. A result arrives as six notifications - Test Sequence,
 * Test Name, Test Value, Test Unit, Test Date Time, then Status - and commands are written to Data Control.
 */
object AnuPathProtocol {
    const val DEVICE_NAME = "anuPath nano"

    val SERVICE: UUID = UUID.fromString("c737c93c-4cda-4ecc-af5d-43b7984cf4ac")
    val TEST_SEQUENCE: UUID = UUID.fromString("248c5967-2bb1-4162-a1ee-a8b5ab53e3b3")
    val TEST_NAME: UUID = UUID.fromString("49e28d0e-90e7-471d-86dc-5e9b37c0e02e")
    val TEST_VALUE: UUID = UUID.fromString("6ea02fec-186a-4d42-9397-9d5c31fc77a6")
    val TEST_UNIT: UUID = UUID.fromString("f1e5dce8-fad5-41b1-9489-a8e5e853ac05")
    val TEST_DATE_TIME: UUID = UUID.fromString("3fede1d5-37e2-4d9b-aa81-3b3858e77fc6")
    val STATUS: UUID = UUID.fromString("28e3cac5-fe0d-4172-b426-3bb2061e2c90")
    val DATA_CONTROL: UUID = UUID.fromString("5c01bad3-d19c-4d57-b336-715900874b2f")
    val SET_DATE_TIME: UUID = UUID.fromString("d9b0b175-98c6-4a22-ba86-988639b6c06e")

    val DEVICE_INFO_SERVICE: UUID = sig16(0x180A)
    val MANUFACTURER_NAME: UUID = sig16(0x2A29)
    val MODEL_NUMBER: UUID = sig16(0x2A24)
    val FIRMWARE_REVISION: UUID = sig16(0x2A26)
    val SOFTWARE_REVISION: UUID = sig16(0x2A28)
    val DEVICE_INFO_CHARACTERISTICS: List<UUID> =
        listOf(MANUFACTURER_NAME, MODEL_NUMBER, FIRMWARE_REVISION, SOFTWARE_REVISION)

    val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    /** Guide V2.0 §5.2: notifications on these six are mandatory. */
    val NOTIFY_CHARACTERISTICS: List<UUID> =
        listOf(TEST_SEQUENCE, TEST_NAME, TEST_VALUE, TEST_UNIT, TEST_DATE_TIME, STATUS)

    val CMD_LAST_RECORD = byteArrayOf(0x01, 0x00)

    const val MIN_RECORD_ID = 0
    const val MAX_RECORD_ID = 999

    const val STATUS_OK = "STATUS_OK"
    const val STATUS_NO_RECORD = "STATUS_NO_RECORD"
    const val STATUS_INVALID_COUNT = "STATUS_INVALID_COUNT"

    /** Request Record: `02 00` + the id as ASCII digits (record 12 = `02 00 31 32`); binary ids are refused. */
    fun requestRecord(id: Int): ByteArray {
        require(id in MIN_RECORD_ID..MAX_RECORD_ID) { "Record id must be $MIN_RECORD_ID..$MAX_RECORD_ID" }
        return byteArrayOf(0x02, 0x00) + id.toString().toByteArray(StandardCharsets.US_ASCII)
    }

    /** Set Date Time payload: UTF-8 "yyyy|MM|dd|HH|mm|ss", 24-hour clock. */
    fun dateTimePayload(date: Date = Date()): ByteArray =
        SimpleDateFormat("yyyy|MM|dd|HH|mm|ss", Locale.US).format(date).toByteArray(StandardCharsets.UTF_8)

    fun decodeString(bytes: ByteArray?): String =
        if (bytes == null) "" else String(bytes, StandardCharsets.UTF_8).trim { it <= ' ' || it == '\u0000' }

    private val TEST_DATE_FORMATS = listOf("dd-MM-yyyy HH:mm:ss", "dd-MM-yyyy HH:mm", "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm")

    /** Test Date Time ("26-10-2026 12:36") as epoch millis in the phone's time zone, or null. */
    fun parseTestDateTime(text: String): Long? {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return null
        for (pattern in TEST_DATE_FORMATS) {
            val format = SimpleDateFormat(pattern, Locale.US).apply { isLenient = false }
            val pos = ParsePosition(0)
            val date = format.parse(trimmed, pos)
            if (date != null && pos.index == trimmed.length) return date.time
        }
        return null
    }

    fun toHex(bytes: ByteArray?): String =
        bytes?.joinToString(" ") { "%02X".format(it.toInt() and 0xFF) } ?: ""

    fun nameOf(uuid: UUID): String = when (uuid) {
        SERVICE -> "Main Service"
        TEST_SEQUENCE -> "Test Sequence"
        TEST_NAME -> "Test Name"
        TEST_VALUE -> "Test Value"
        TEST_UNIT -> "Test Unit"
        TEST_DATE_TIME -> "Test Date Time"
        STATUS -> "Status"
        DATA_CONTROL -> "Data Control"
        SET_DATE_TIME -> "Set Date Time"
        MANUFACTURER_NAME -> "Manufacturer"
        MODEL_NUMBER -> "Model Number"
        FIRMWARE_REVISION -> "Firmware Revision"
        SOFTWARE_REVISION -> "Software Revision"
        CCCD -> "CCCD"
        else -> uuid.toString()
    }

    private fun sig16(short: Int): UUID = UUID.fromString("0000%04x-0000-1000-8000-00805f9b34fb".format(short))
}
