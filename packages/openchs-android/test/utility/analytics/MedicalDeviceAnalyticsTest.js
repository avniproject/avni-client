import {assert} from "chai";

// Firebase is replaced by a recorder; logging is switched on.
const logged = [];
jest.mock("@react-native-firebase/analytics", () => () => ({
    logEvent: (name, params) => {
        logged.push({name, params});
        return Promise.resolve();
    },
    setUserId: () => Promise.resolve(),
    setUserProperty: () => Promise.resolve(),
    logScreenView: () => Promise.resolve()
}));
jest.mock("../../../src/framework/EnvironmentConfig", () => ({logAnalytics: () => true}));
jest.mock("react-native-device-info", () => ({
    getBrand: () => "Brand", getModel: () => "Model", getTotalMemorySync: () => 0, getHardware: () => "hw",
    getTotalMemory: () => Promise.resolve(0), getVersion: () => "1", getBuildNumber: () => "1"
}));

// test/jestSetupFile.js mocks Analytics for every suite; this one tests the real module.
jest.unmock("../../../src/utility/Analytics");
const Analytics = require("../../../src/utility/Analytics");

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const events = (name) => logged.filter((e) => e.name === name).map((e) => e.params);
const screening = {uuid: "enc-1", name: "Diabetic screening", programEnrolment: {program: {name: "NCD"}, individual: {subjectType: {name: "Individual"}}}};

describe("Medical device analytics", () => {
    beforeEach(() => {
        logged.length = 0;
    });

    it("adds the device summary to patient_screening_completed", async () => {
        Analytics.logScreeningStarted(screening);
        Analytics.logMedicalDeviceCaptureMethod("blood_glucose", "device", "auto");
        Analytics.logMedicalDeviceCaptureMethod("hemoglobin", "device", "auto");
        Analytics.logMedicalDeviceConnection({medicalDeviceType: "anupath", test: "blood_glucose", outcome: "failed", failureReason: "bluetooth_off", durationMs: 10});
        Analytics.logMedicalDeviceConnection({medicalDeviceType: "anupath", test: "blood_glucose", outcome: "failed", failureReason: "cancelled", durationMs: 10});
        Analytics.logMedicalDeviceConnection({
            medicalDeviceType: "anupath", test: "blood_glucose", outcome: "connected", durationMs: 1200, remembered: true,
            deviceId: "C4:DE:E2:19:63:26", details: "anuPath nano PS-AN002-01 | PathShodh | FW 10.0.0 | SW 1.2", firmware: "10.0.0"
        });
        Analytics.logMedicalDeviceReading({medicalDeviceType: "anupath", test: "blood_glucose", outcome: "accepted", recordAgeMinutes: 3, unit: "mg/dL", deviceId: "C4:DE:E2:19:63:26", durationMs: 5000});
        Analytics.logMedicalDeviceCaptureMethod("hemoglobin", "manual", "user");
        Analytics.logScreeningCompleted("enc-1");
        await flush();

        const connection = events("medical_device_connection")[2];
        assert.equal(connection.outcome, "connected");
        assert.equal(connection.medical_device_remembered, "true");
        assert.equal(connection.medical_device_id, "C4:DE:E2:19:63:26");
        assert.equal(connection.medical_device_firmware, "10.0.0");
        assert.notProperty(connection, "failure_reason");

        const completed = events("patient_screening_completed")[0];
        assert.equal(completed.capture_summary, "blood_glucose:device,hemoglobin:manual");
        assert.equal(completed.medical_device_ids, "C4:DE:E2:19:63:26");
        assert.equal(completed.medical_device_connection_failures, 1); // the cancelled attempt is not a failure
        assert.equal(completed.medical_device_readings_accepted, 1);
    });

    it("reports a Device run test without an accepted reading as not_captured, also when abandoned", async () => {
        Analytics.logScreeningStarted({...screening, uuid: "enc-2"});
        Analytics.logMedicalDeviceCaptureMethod("blood_glucose", "device", "auto");
        Analytics.logMedicalDeviceConnection({medicalDeviceType: "anupath", test: "blood_glucose", outcome: "failed", failureReason: "timeout", durationMs: 20000});
        Analytics.logTaskDuration("encounter", "Diabetic screening", 30000, "abandoned");
        await flush();

        const abandoned = events("patient_screening_abandoned")[0];
        assert.equal(abandoned.capture_summary, "blood_glucose:not_captured");
        assert.equal(abandoned.medical_device_connection_failures, 1);
        assert.equal(abandoned.medical_device_readings_accepted, 0);
        assert.notProperty(abandoned, "medical_device_ids");
    });

    it("switching to Manual run drops an earlier device reading from the summary", async () => {
        Analytics.logScreeningStarted({...screening, uuid: "enc-3"});
        Analytics.logMedicalDeviceCaptureMethod("blood_glucose", "device", "auto");
        Analytics.logMedicalDeviceReading({medicalDeviceType: "anupath", test: "blood_glucose", outcome: "accepted"});
        Analytics.logMedicalDeviceCaptureMethod("blood_glucose", "manual", "user");
        Analytics.logMedicalDeviceCaptureMethod("blood_glucose", "device", "user");
        Analytics.logScreeningCompleted("enc-3");
        await flush();
        assert.equal(events("patient_screening_completed")[0].capture_summary, "blood_glucose:not_captured");
    });

    it("sends no device params for a screening without device questions", async () => {
        Analytics.logScreeningStarted({...screening, uuid: "enc-4"});
        Analytics.logScreeningCompleted("enc-4");
        await flush();
        const completed = events("patient_screening_completed")[0];
        assert.notProperty(completed, "capture_summary");
        assert.notProperty(completed, "medical_device_connection_failures");
    });

    it("logs medical_device_changed with both IDs", async () => {
        Analytics.logMedicalDeviceChanged("anupath", "C4:DE:E2:19:63:26", "C4:DE:E2:19:70:01");
        await flush();
        const changed = events("medical_device_changed")[0];
        assert.include(changed, {
            medical_device_type: "anupath", previous_medical_device_id: "C4:DE:E2:19:63:26", medical_device_id: "C4:DE:E2:19:70:01"
        });
        // The common details are added by logEvent as for every other event.
        assert.containsAllKeys(changed, ["build_version", "device_details", "tenant", "event_time_local"]);
    });
});
