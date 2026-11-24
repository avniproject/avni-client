import {assert} from "chai";
import {Concept} from "openchs-models";
import {deviceTestFor, isAnuPathDetailsElement} from "../../../../src/views/form/device/DeviceReadingButton";
import {analyticsTestKey, captureMethodFor, orphanedDeviceDetails} from "../../../../src/utility/anupath/AnuPathFields";
import {DEVICE_TEST} from "../../../../src/utility/anupath/AnuPathDevice";

// A form element as the detection functions see it: uuid, name, concept datatype and form-element key-values.
let uuid = 0;
const element = (name, datatype, keyValues = {}) => ({
    uuid: `fe-${++uuid}`,
    name,
    concept: {name, datatype},
    recordValueByKey: (key) => keyValues[key]
});
const numeric = (name, keyValues) => element(name, Concept.dataType.Numeric, keyValues);
const text = (name, keyValues) => element(name, Concept.dataType.Text, keyValues);
const anuPath = (deviceField) => ({deviceModule: "anuPath", deviceField});

describe("anuPath device-field detection (key-values only)", () => {
    it("finds the test from the key-values, whatever the question is called", () => {
        assert.equal(deviceTestFor(numeric("Sugar level", anuPath("bloodGlucose"))), DEVICE_TEST.BLOOD_GLUCOSE);
        assert.equal(deviceTestFor(numeric("Hb", anuPath("hemoglobin"))), DEVICE_TEST.HEMOGLOBIN);
        assert.equal(deviceTestFor(numeric("A1c", anuPath("hba1c"))), DEVICE_TEST.HBA1C);
        assert.equal(deviceTestFor(numeric("A1c", anuPath(" HbA1c "))), DEVICE_TEST.HBA1C);
    });

    it("reads key-values without caring about case or spaces", () => {
        assert.equal(deviceTestFor(numeric("x", {deviceModule: " AnuPath ", deviceField: "BloodGlucose"})), DEVICE_TEST.BLOOD_GLUCOSE);
    });

    it("ignores question names: without key-values nothing is a device question", () => {
        assert.isNull(deviceTestFor(numeric("Blood Glucose value from device")));
        assert.isFalse(isAnuPathDetailsElement(text("Device details")));
        assert.isFalse(isAnuPathDetailsElement(text("Mobile device details")));
    });

    it("ignores unknown values and other devices' questions", () => {
        assert.isNull(deviceTestFor(numeric("x", anuPath("bloodglucos"))));
        assert.isNull(deviceTestFor(numeric("x", {deviceModule: "BloodPressure", deviceField: "systolic"})));
        assert.isNull(deviceTestFor(text("x", anuPath("bloodGlucose"))));
    });

    it("details: only anuPath's details are read-only and filled; other devices' details are ordinary questions", () => {
        assert.isTrue(isAnuPathDetailsElement(text("Meter info", anuPath("details"))));
        assert.isFalse(isAnuPathDetailsElement(text("BP details", {deviceModule: "BloodPressure", deviceField: "details"})));
        assert.isFalse(isAnuPathDetailsElement(text("Details", {deviceField: "details"})));
        assert.isFalse(isAnuPathDetailsElement(numeric("x", anuPath("details"))));
    });
});

describe("anuPath orphanedDeviceDetails", () => {
    const capture = element("How is the Blood Glucose value captured?", Concept.dataType.Coded);
    const value = numeric("Blood Glucose value from device", anuPath("bloodGlucose"));
    const manual = numeric("Blood Glucose value (manual)");
    const details = text("Device details", anuPath("details"));
    const hbValue = numeric("Hemoglobin value from device", anuPath("hemoglobin"));
    const hbDetails = text("Device details", anuPath("details"));
    const page = [capture, value, manual, details, hbValue, hbDetails];

    it("keeps the details while the device value is in use", () => {
        assert.deepEqual(orphanedDeviceDetails(page, page), []);
    });

    it("clears the details when the device value is no longer applicable (Manual run)", () => {
        const applicable = [capture, manual, details, hbValue, hbDetails];
        assert.deepEqual(orphanedDeviceDetails(page, applicable), [details]);
    });

    it("each details question follows its own device value", () => {
        const applicable = [capture, value, manual, details, hbDetails];
        assert.deepEqual(orphanedDeviceDetails(page, applicable), [hbDetails]);
    });
});

describe("capture method question (analytics)", () => {
    it("maps test names to analytics keys", () => {
        assert.equal(analyticsTestKey(DEVICE_TEST.BLOOD_GLUCOSE), "blood_glucose");
        assert.equal(analyticsTestKey("bloodGlucose"), "blood_glucose");
        assert.equal(analyticsTestKey(DEVICE_TEST.HEMOGLOBIN), "hemoglobin");
        assert.equal(analyticsTestKey(DEVICE_TEST.HBA1C), "hba1c");
        assert.equal(analyticsTestKey("hba1c"), "hba1c");
        assert.isNull(analyticsTestKey("Lipid profile"));
        assert.isNull(analyticsTestKey(null));
    });

    const select = (name, keyValues) => element(name, Concept.dataType.Coded, keyValues);

    it("takes the test from cardGroup, else from the question name", () => {
        assert.deepEqual(captureMethodFor(select("Method", {cardGroup: "bloodGlucose"}), "Device run"), {test: "blood_glucose", captureMethod: "device"});
        assert.deepEqual(captureMethodFor(select("How is the Blood Glucose value captured?"), "Manual run"), {test: "blood_glucose", captureMethod: "manual"});
        assert.deepEqual(captureMethodFor(select("How is the Haemoglobin captured?"), "Device run"), {test: "hemoglobin", captureMethod: "device"});
        assert.deepEqual(captureMethodFor(select("Method", {cardGroup: "hba1c"}), "Device run"), {test: "hba1c", captureMethod: "device"});
        assert.deepEqual(captureMethodFor(select("How is the HbA1c value captured?"), "Manual run"), {test: "hba1c", captureMethod: "manual"});
    });

    it("ignores other questions and answers", () => {
        assert.isNull(captureMethodFor(select("How is the Lipid profile captured?"), "Device run"));
        assert.isNull(captureMethodFor(select("Gender"), "Male"));
        assert.isNull(captureMethodFor(select("Method", {cardGroup: "bloodGlucose"}), "Not done"));
    });
});
