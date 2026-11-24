import {Linking, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import _ from "lodash";
import moment from "moment";

/**
 * JS side of the anuPath nano (PathShodh) Bluetooth meter. Thin wrapper over the native
 * AnuPathModule (android/.../anupath/AnuPathModule.kt) plus the rules for choosing which stored
 * result belongs to the current test:
 *  - only a result of the requested test type ("Blood Glucose" / "HbA1c" / "Hemoglobin") is used;
 *  - the newest such result is taken, stepping back from the meter's newest record.
 * No age limit is applied to the result for now (can be added later if the programme needs one).
 */
const {AnuPathModule} = NativeModules;
const emitter = AnuPathModule ? new NativeEventEmitter(AnuPathModule) : null;

// Test names exactly as the meter sends them (Integration Guide V2.0, section 5.3). The delivered units
// (FW 10.0.0) run Blood Glucose and HbA1c; Hemoglobin is kept for the anuPath nano model that measures it.
export const DEVICE_TEST = {
    BLOOD_GLUCOSE: "Blood Glucose",
    HBA1C: "HbA1c",
    HEMOGLOBIN: "Hemoglobin"
};

// How far back (in records) to look for a result of the requested test.
const MAX_RECORDS_TO_CHECK = 10;
const REMEMBERED_METER_KEY = "anupath.rememberedMeter";

export const isAvailable = () => !_.isNil(AnuPathModule);

export const isSupported = () => (isAvailable() ? AnuPathModule.isSupported() : Promise.resolve(false));

/**
 * Asks for the Bluetooth permissions. Resolves {granted, blocked}: blocked is true when Android will not
 * show the dialog any more ("Don't ask again", or denied twice) - then only the app settings can grant it.
 */
export async function ensurePermissions() {
    if (Platform.OS !== "android") return {granted: false, blocked: false};
    const permissions = Platform.Version >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const result = await PermissionsAndroid.requestMultiple(permissions);
    const granted = _.every(permissions, (p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
    const blocked = !granted && _.some(permissions, (p) => result[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    return {granted, blocked};
}

export const openAppSettings = () => Linking.openSettings();

export const isBluetoothEnabled = () => AnuPathModule.isBluetoothEnabled();
export const requestEnableBluetooth = () => AnuPathModule.requestEnableBluetooth();
export const startScan = (timeoutMs = 15000) => AnuPathModule.startScan(timeoutMs);
export const stopScan = () => AnuPathModule.stopScan();
export const connect = (address) => AnuPathModule.connect(address);
export const disconnect = () => (isAvailable() ? AnuPathModule.disconnect() : Promise.resolve(true));
export const getLastRecord = () => AnuPathModule.getLastRecord();
export const getRecord = (id) => AnuPathModule.getRecord(id);

const subscribe = (event, handler) => {
    if (_.isNil(emitter)) return {remove: _.noop};
    return emitter.addListener(event, handler);
};
export const onDeviceFound = (handler) => subscribe("AnuPathDeviceFound", handler);
export const onScanStopped = (handler) => subscribe("AnuPathScanStopped", handler);
export const onConnectionState = (handler) => subscribe("AnuPathConnectionState", handler);
export const onRecordPushed = (handler) => subscribe("AnuPathRecordPushed", (event) => handler(event && event.record));

export async function getRememberedMeter() {
    try {
        const json = await AsyncStorage.getItem(REMEMBERED_METER_KEY);
        return _.isNil(json) ? null : JSON.parse(json);
    } catch (e) {
        return null;
    }
}

export async function rememberMeter(meter) {
    try {
        await AsyncStorage.setItem(REMEMBERED_METER_KEY, JSON.stringify(_.pick(meter, ["address", "name"])));
    } catch (e) {
        // Not remembering only means the worker picks the meter again next time.
    }
}

export async function forgetMeter() {
    try {
        await AsyncStorage.removeItem(REMEMBERED_METER_KEY);
    } catch (e) {
        // ignore
    }
}

/** Short device ID: the last two bytes of its MAC, e.g. "63:26" (can be printed on a sticker later). */
export const shortId = (address) => (address || "").slice(-5);

const normalise = (text) => (text || "").toLowerCase().replace(/\s+/g, "");
export const isTestOfType = (record, testName) => !_.isNil(record) && normalise(record.testName) === normalise(testName);

/**
 * Newest result of the given test type. Resolves
 *   {status: "OK", record}            - found
 *   {status: "NO_RECORDS"}            - the meter has no stored results
 *   {status: "NOT_FOUND", newest}     - none of that type in the last MAX_RECORDS_TO_CHECK records
 *                                       (newest = the meter's newest record, for the message)
 */
export async function fetchLatestOfType(testName) {
    const newest = await getLastRecord();
    if (_.isNil(newest)) return {status: "NO_RECORDS"};
    let record = newest;
    let id = newest.sequence;
    for (let checked = 1; ; checked++) {
        if (isTestOfType(record, testName)) return {status: "OK", record};
        if (checked >= MAX_RECORDS_TO_CHECK || !_.isFinite(id) || id <= 0) return {status: "NOT_FOUND", newest};
        id -= 1;
        record = await getRecordChecked(id);
    }
}

// getRecord(id), making sure the reply is record `id`: a late reply to an earlier request could otherwise
// be taken for it. Asked once more on a mismatch; still wrong -> an error the sheet shows with Retry.
async function getRecordChecked(id) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        const record = await getRecord(id);
        if (_.isNil(record) || record.sequence === id) return record;
    }
    const error = new Error("The meter returned a different record. Please try again.");
    error.code = "RECORD_MISMATCH";
    throw error;
}

/**
 * The record's Test Value as a number, or null when it is missing or not a plain number (a dropped
 * notification, or a non-numeric reading). A Numeric question silently ignores a non-number, so such a
 * record must not be accepted: the old value would stay while the device details changed.
 */
export function numericValue(record) {
    const text = _.trim(_.toString(_.get(record, "value", "")));
    if (text === "") return null;
    const number = Number(text);
    return _.isFinite(number) ? number : null;
}

/**
 * Splits the meter's test date-time ("26-10-2026 12:33" or "26-10-2026 12:33:05") into
 * {date: "26-10-2026", time: "12:33"}. If it is not in that shape, the whole text is the date.
 */
export function splitTestedAt(dateTime) {
    const text = _.trim(dateTime || "");
    const match = text.match(/^(\S+)\s+(\d{1,2}:\d{2})(?::\d{2})?$/);
    return match ? {date: match[1], time: match[2]} : {date: text, time: null};
}

/** "Tested on 26-10-2026 at 12:33" (or "Tested on <date>" when there is no time); "" if unknown. */
export function testedOnText(dateTime) {
    const {date, time} = splitTestedAt(dateTime);
    if (_.isEmpty(date)) return "";
    return time ? `Tested on ${date} at ${time}` : `Tested on ${date}`;
}

/**
 * One line for the "Device details" field, with everything the meter reports about itself (the same
 * details the bottom sheet used to show) plus the record and when it was tested.
 */
export function deviceDetailsText(deviceInfo, record) {
    const info = deviceInfo || {};
    const parts = [
        _.compact(["anuPath nano", info.model]).join(" "),
        info.address ? `ID ${info.address}` : null,
        info.firmware ? `FW ${info.firmware}` : null,
        info.software ? `SW ${info.software}` : null,
        info.manufacturer || null,
        _.isFinite(record && record.sequence) ? `Record #${record.sequence}` : null,
        testedOnText(record && record.dateTime) || null
    ];
    return _.compact(parts).join(" · ");
}

/**
 * For analytics: model, manufacturer, firmware and software in one line, e.g.
 * "anuPath nano PS-AN002-01 | PathShodh | FW 10.0.0 | SW 1.2" (no device ID - that is sent on its own).
 */
export function analyticsDetails(deviceInfo) {
    const info = deviceInfo || {};
    return _.compact([
        _.compact(["anuPath nano", info.model]).join(" "),
        info.manufacturer || null,
        info.firmware ? `FW ${info.firmware}` : null,
        info.software ? `SW ${info.software}` : null
    ]).join(" | ");
}

/** Whole minutes between the record's test time on the meter and now; null when the time cannot be read. */
export function recordAgeMinutes(record, now = Date.now()) {
    const text = _.trim(_.get(record, "dateTime", ""));
    if (text === "") return null;
    const testedAt = moment(text, ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY HH:mm"], true);
    return testedAt.isValid() ? Math.round((now - testedAt.valueOf()) / 60000) : null;
}

/** Analytics failure_reason for an error from connect() / startScan(). */
export function connectionFailureReason(error) {
    const code = _.get(error, "code");
    if (code === "TIMEOUT") return "timeout";
    if (code === "BLUETOOTH_OFF") return "bluetooth_off";
    if (code === "CANCELLED") return "cancelled";
    if (code === "CONNECT_FAILED") return /not an anupath/i.test(_.get(error, "message", "")) ? "not_anupath" : "disconnected";
    return "other";
}
