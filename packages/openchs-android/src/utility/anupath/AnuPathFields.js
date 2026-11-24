import _ from "lodash";
import {Concept} from "openchs-models";
import {DEVICE_TEST} from "./AnuPathDevice";

/**
 * Which form questions belong to the anuPath meter, decided only by form-element key-values set on the
 * server (no question-name matching, so unrelated questions such as "Mobile device details" are never
 * affected, and renaming a question cannot break anything):
 *   deviceModule = "anuPath"
 *   deviceField  = "bloodGlucose" | "hba1c" | "hemoglobin"  (the Numeric value the reading fills)
 *                | "details"                               (the Text "Device details" line, usually a hidden concept)
 * The same keys mark the Neurosynaptic device questions (with their own deviceModule).
 * Keys and values are matched ignoring case and surrounding spaces; anything else is not a device question.
 */
export const DEVICE_MODULE_KEY = "deviceModule";
export const DEVICE_FIELD_KEY = "deviceField";
const ANUPATH_MODULE = "anupath";
const DETAILS_FIELD = "details";
const FIELD_TEST = {bloodglucose: DEVICE_TEST.BLOOD_GLUCOSE, hba1c: DEVICE_TEST.HBA1C, hemoglobin: DEVICE_TEST.HEMOGLOBIN};

const keyValue = (formElement, key) => {
    const value = _.invoke(formElement, "recordValueByKey", key);
    return _.isNil(value) ? null : _.toLower(_.trim(String(value)));
};
const isText = (formElement) =>
    _.includes([Concept.dataType.Text, Concept.dataType.Notes], _.get(formElement, "concept.datatype"));
const isAnuPath = (formElement) => keyValue(formElement, DEVICE_MODULE_KEY) === ANUPATH_MODULE;

/** The anuPath test a Numeric question receives ("Blood Glucose" / "HbA1c" / "Hemoglobin"), or null. */
export const deviceTestFor = (formElement) => {
    if (_.get(formElement, "concept.datatype") !== Concept.dataType.Numeric || !isAnuPath(formElement)) return null;
    return FIELD_TEST[keyValue(formElement, DEVICE_FIELD_KEY)] || null;
};

/**
 * An anuPath "Device details" question (Text/Notes, deviceModule = anuPath, deviceField = details): shown
 * read-only and filled by the reading. A details question keyed for another device is not touched here -
 * it stays an ordinary question unless that device's own code fills it.
 */
export const isAnuPathDetailsElement = (formElement) =>
    isText(formElement) && isAnuPath(formElement) && keyValue(formElement, DEVICE_FIELD_KEY) === DETAILS_FIELD;

/**
 * anuPath "Device details" questions whose reading is no longer in use: the device value question just
 * before them on the page is not applicable any more (e.g. the capture method was switched to Manual run).
 * Avni then removes the value; the details must go with it, since the details question itself stays
 * applicable (it is hidden with the concept setting, not a rule) and cannot be cleared by the worker.
 * `allElements` in page order; `applicableElements` as Avni computes them (state.filteredFormElements).
 */
export function orphanedDeviceDetails(allElements, applicableElements) {
    const applicable = new Set(_.map(applicableElements, "uuid"));
    const orphans = [];
    let valueElement = null;
    _.forEach(allElements, (fe) => {
        if (!_.isNil(deviceTestFor(fe))) valueElement = fe;
        else if (isAnuPathDetailsElement(fe) && valueElement && !applicable.has(valueElement.uuid)) orphans.push(fe);
    });
    return orphans;
}

// ---- capture method question ("How is the Blood Glucose value captured?" - Device run / Manual run) ----
export const CARD_GROUP_KEY = "cardGroup";
const CAPTURE_QUESTION_PATTERN = /^how (?:is|was) (?:the )?(.+?) (?:captured|measured|recorded|taken)\b/;

/** Lower case, single spaces, no punctuation - so "Blood  Glucose value (manual)" contains "blood glucose value". */
export const normaliseName = (name) => _.trim(_.toLower(name || "").replace(/[^a-z0-9]+/g, " "));

/** The value a capture-method question is about: "How is the Blood Glucose value captured?" -> "blood glucose value". */
export const captureQuestionPhrase = (name) => {
    const match = normaliseName(name).match(CAPTURE_QUESTION_PATTERN);
    return match ? match[1] : null;
};

// Analytics key of each anuPath test, looked up by the name with case, spaces and punctuation removed, so
// "Blood Glucose" / "bloodGlucose" / "blood glucose" all give blood_glucose. Listed explicitly because
// _.snakeCase would turn "HbA1c" into "hb_a_1_c".
const ANALYTICS_TEST_KEYS = {
    bloodglucose: "blood_glucose",
    hba1c: "hba1c",
    hemoglobin: "hemoglobin",
    haemoglobin: "hemoglobin"
};

/** Analytics key for an anuPath test ("Blood Glucose", "bloodGlucose", "HbA1c", "haemoglobin" ...); null for any other test. */
export const analyticsTestKey = (testName) =>
    ANALYTICS_TEST_KEYS[_.toLower(_.toString(testName)).replace(/[^a-z0-9]+/g, "")] || null;

/**
 * For analytics: which test a capture-method question is about and which method an answer means. The test
 * comes from its cardGroup key-value ("bloodGlucose" -> blood_glucose) or, without one, from the question name
 * ("How is the Blood Glucose value captured?" -> blood_glucose). Returns {test, captureMethod}, or null when it
 * is not a capture question for an anuPath test or the answer is neither Device nor Manual.
 */
export function captureMethodFor(formElement, answerName) {
    const captureMethod = /^device\b/i.test(answerName || "") ? "device" : (/^manual\b/i.test(answerName || "") ? "manual" : null);
    if (_.isNil(captureMethod)) return null;
    const group = _.invoke(formElement, "recordValueByKey", CARD_GROUP_KEY) ??
        _.invoke(_.get(formElement, "concept"), "recordValueByKey", CARD_GROUP_KEY);
    const phrase = captureQuestionPhrase(_.get(formElement, "name"));
    const test = analyticsTestKey(!_.isNil(group) && group !== "" ? String(group) : (phrase ? phrase.replace(/ value$/, "") : ""));
    return _.isNil(test) ? null : {test, captureMethod};
}
