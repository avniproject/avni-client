import {assert} from "chai";
import {NativeModules, PermissionsAndroid, Platform} from "react-native";

// Records on a fake meter, keyed by slot id; getLastRecord returns the highest id.
let slots = {};
NativeModules.AnuPathModule = {
    addListener: () => {},
    removeListeners: () => {},
    getLastRecord: () => {
        const ids = Object.keys(slots).map(Number);
        return Promise.resolve(ids.length === 0 ? null : slots[Math.max(...ids)]);
    },
    getRecord: (id) => Promise.resolve(slots[id] || null)
};

const AnuPath = require("../../../src/utility/anupath/AnuPathDevice");

const NOW = Date.parse("2026-11-05T12:00:00");
const minutesAgo = (m) => NOW - m * 60 * 1000;
const record = (sequence, testName, value, testedAt) => ({sequence, testName, value, unit: "", dateTime: "", testedAt});

describe("AnuPathDevice.fetchLatestOfType", () => {
    beforeEach(() => {
        slots = {};
    });

    it("returns the newest record when it is the requested test and recent", async () => {
        slots = {0: record(0, "Blood Glucose", "110", minutesAgo(30)), 1: record(1, "Blood Glucose", "118", minutesAgo(2))};
        const result = await AnuPath.fetchLatestOfType("Blood Glucose");
        assert.equal(result.status, "OK");
        assert.equal(result.record.value, "118");
    });

    it("steps back past a newer test of another type", async () => {
        slots = {4: record(4, "Blood Glucose", "140", minutesAgo(6)), 5: record(5, "Hemoglobin", "13.5", minutesAgo(1))};
        const glucose = await AnuPath.fetchLatestOfType("Blood Glucose");
        assert.equal(glucose.status, "OK");
        assert.equal(glucose.record.sequence, 4);
        const hb = await AnuPath.fetchLatestOfType("Hemoglobin");
        assert.equal(hb.record.sequence, 5);
    });

    it("reads an HbA1c result (in %, one decimal place) and tells it apart from Blood Glucose", async () => {
        slots = {6: record(6, "HbA1c", "5.6", minutesAgo(3)), 7: record(7, "Blood Glucose", "123", minutesAgo(1))};
        const a1c = await AnuPath.fetchLatestOfType(AnuPath.DEVICE_TEST.HBA1C);
        assert.equal(a1c.status, "OK");
        assert.equal(a1c.record.sequence, 6);
        assert.equal(AnuPath.numericValue(a1c.record), 5.6);
        const hb = await AnuPath.fetchLatestOfType(AnuPath.DEVICE_TEST.HEMOGLOBIN);
        assert.equal(hb.status, "NOT_FOUND");
    });

    it("takes the newest result of the requested test regardless of its age", async () => {
        slots = {2: record(2, "Blood Glucose", "180", minutesAgo(600)), 3: record(3, "Hemoglobin", "12.0", minutesAgo(1))};
        const result = await AnuPath.fetchLatestOfType("Blood Glucose");
        assert.equal(result.status, "OK");
        assert.equal(result.record.sequence, 2);
    });

    it("reports not found when no result of that test is among the recent records", async () => {
        slots = {0: record(0, "Hemoglobin", "12.5", minutesAgo(5)), 1: record(1, "Hemoglobin", "13.0", minutesAgo(1))};
        const result = await AnuPath.fetchLatestOfType("Blood Glucose");
        assert.equal(result.status, "NOT_FOUND");
        assert.equal(result.newest.sequence, 1);
    });

    it("reports an empty meter", async () => {
        const result = await AnuPath.fetchLatestOfType("Blood Glucose");
        assert.equal(result.status, "NO_RECORDS");
    });

    it("matches test names ignoring case and spaces", () => {
        assert.isTrue(AnuPath.isTestOfType({testName: "blood glucose"}, "Blood Glucose"));
        assert.isFalse(AnuPath.isTestOfType({testName: "Hemoglobin"}, "Blood Glucose"));
    });

    it("builds the device details line with all meter details", () => {
        const line = AnuPath.deviceDetailsText({model: "PS-AN002-01", address: "C0:9B:9E:3E:63:26", firmware: "10.0.0",
            software: "V4.0", manufacturer: "PathShodh Healthcare Private Limited"}, {sequence: 12, dateTime: "05-11-2026 11:52"});
        assert.equal(line, "anuPath nano PS-AN002-01 · ID C0:9B:9E:3E:63:26 · FW 10.0.0 · SW V4.0 · " +
            "PathShodh Healthcare Private Limited · Record #12 · Tested on 05-11-2026 at 11:52");
    });

    it("leaves out details the meter did not report", () => {
        const line = AnuPath.deviceDetailsText({address: "C0:9B:9E:3E:63:26"}, {dateTime: "05-11-2026 11:52:30"});
        assert.equal(line, "anuPath nano · ID C0:9B:9E:3E:63:26 · Tested on 05-11-2026 at 11:52");
    });

    it("formats the tested date and time", () => {
        assert.deepEqual(AnuPath.splitTestedAt("26-10-2026 12:33"), {date: "26-10-2026", time: "12:33"});
        assert.deepEqual(AnuPath.splitTestedAt("26-10-2026 12:33:09"), {date: "26-10-2026", time: "12:33"});
        assert.deepEqual(AnuPath.splitTestedAt("26-10-2026"), {date: "26-10-2026", time: null});
        assert.equal(AnuPath.testedOnText("26-10-2026 12:33"), "Tested on 26-10-2026 at 12:33");
        assert.equal(AnuPath.testedOnText(""), "");
    });
});

describe("AnuPathDevice.numericValue", () => {
    it("accepts plain numbers", () => {
        assert.equal(AnuPath.numericValue({value: "112"}), 112);
        assert.equal(AnuPath.numericValue({value: " 12.6 "}), 12.6);
    });

    it("refuses a missing or non-numeric value", () => {
        assert.isNull(AnuPath.numericValue({value: ""}));
        assert.isNull(AnuPath.numericValue({value: "   "}));
        assert.isNull(AnuPath.numericValue({}));
        assert.isNull(AnuPath.numericValue(null));
        assert.isNull(AnuPath.numericValue({value: "HI"}));
        assert.isNull(AnuPath.numericValue({value: ">600"}));
        assert.isNull(AnuPath.numericValue({value: "12a"}));
    });
});

describe("AnuPathDevice.fetchLatestOfType record id check", () => {
    beforeEach(() => {
        slots = {};
    });

    it("does not take a late reply for another record as the record asked for", async () => {
        slots = {5: record(5, "Hemoglobin", "12.1"), 4: record(3, "Blood Glucose", "140")};   // slot 4 answers with #3
        try {
            await AnuPath.fetchLatestOfType("Blood Glucose");
            assert.fail("expected an error");
        } catch (e) {
            assert.equal(e.code, "RECORD_MISMATCH");
        }
    });

    it("uses the record when the meter answers with the id asked for", async () => {
        slots = {5: record(5, "Hemoglobin", "12.1"), 4: record(4, "Blood Glucose", "140")};
        const result = await AnuPath.fetchLatestOfType("Blood Glucose");
        assert.equal(result.status, "OK");
        assert.equal(result.record.sequence, 4);
    });
});

describe("AnuPathDevice.ensurePermissions", () => {
    const originalOS = Platform.OS;
    const originalRequest = PermissionsAndroid.requestMultiple;
    const answer = (value) => () => Promise.resolve({
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: value,
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: value,
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: value
    });

    beforeEach(() => {
        Platform.OS = "android";
    });

    afterEach(() => {
        Platform.OS = originalOS;
        PermissionsAndroid.requestMultiple = originalRequest;
    });

    it("granted", async () => {
        PermissionsAndroid.requestMultiple = answer(PermissionsAndroid.RESULTS.GRANTED);
        assert.deepEqual(await AnuPath.ensurePermissions(), {granted: true, blocked: false});
    });

    it("denied once: can ask again", async () => {
        PermissionsAndroid.requestMultiple = answer(PermissionsAndroid.RESULTS.DENIED);
        assert.deepEqual(await AnuPath.ensurePermissions(), {granted: false, blocked: false});
    });

    it("never ask again: blocked, so the sheet sends the worker to the app settings", async () => {
        PermissionsAndroid.requestMultiple = answer(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
        assert.deepEqual(await AnuPath.ensurePermissions(), {granted: false, blocked: true});
    });
});

describe("AnuPathDevice analytics helpers", () => {
    it("combines the meter's details in one line", () => {
        assert.equal(AnuPath.analyticsDetails({model: "PS-AN002-01", manufacturer: "PathShodh", firmware: "10.0.0", software: "1.2", address: "C4:DE:E2:19:63:26"}),
            "anuPath nano PS-AN002-01 | PathShodh | FW 10.0.0 | SW 1.2");
        assert.equal(AnuPath.analyticsDetails(null), "anuPath nano");
    });

    it("works out the record's age in minutes", () => {
        const now = new Date(2026, 10, 18, 12, 40, 0).getTime();
        assert.equal(AnuPath.recordAgeMinutes({dateTime: "18-11-2026 12:33"}, now), 7);
        assert.equal(AnuPath.recordAgeMinutes({dateTime: "18-11-2026 12:30:30"}, now), 10);
        assert.isNull(AnuPath.recordAgeMinutes({dateTime: "garbage"}, now));
        assert.isNull(AnuPath.recordAgeMinutes({}, now));
    });

    it("maps connection errors to failure reasons", () => {
        assert.equal(AnuPath.connectionFailureReason({code: "TIMEOUT"}), "timeout");
        assert.equal(AnuPath.connectionFailureReason({code: "BLUETOOTH_OFF"}), "bluetooth_off");
        assert.equal(AnuPath.connectionFailureReason({code: "CANCELLED"}), "cancelled");
        assert.equal(AnuPath.connectionFailureReason({code: "CONNECT_FAILED", message: "Not an anuPath device (service missing)"}), "not_anupath");
        assert.equal(AnuPath.connectionFailureReason({code: "CONNECT_FAILED", message: "Disconnected (status 8)"}), "disconnected");
        assert.equal(AnuPath.connectionFailureReason(new Error("x")), "other");
    });
});
