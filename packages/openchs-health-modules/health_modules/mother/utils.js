import { FormElementsStatusHelper } from "rules-config/rules";
import _ from "lodash";
import C from '../common';

const TRIMESTER_MAPPING = new Map([[1, { from: 0, to: 12 }], [2, { from: 13, to: 28 }], [3, { from: 29, to: 40 }]]);
const WEIGHT_GAIN_MAPPING = new Map([
    ["11", { from: 0, to: 1 }],
    ["12", { from: 0, to: 1 }],
    ["22", { from: 2, to: 3 }],
    ["23", { from: 5, to: 6 }],
    ["33", { from: 2, to: 3 }],
    ["13", { from: 10, to: 12 }]]);

export let gestationalAge = (enrolment, toDate = new Date()) => FormElementsStatusHelper.weeksBetween(toDate,
    enrolment.getObservationValue("Last menstrual period"));

export let currentTrimester = (enrolment, toDate = new Date()) => [...TRIMESTER_MAPPING.keys()]
    .find((trimester) =>
        gestationalAge(enrolment, toDate) <= TRIMESTER_MAPPING.get(trimester).to &&
        gestationalAge(enrolment, toDate) >= TRIMESTER_MAPPING.get(trimester).from);

export let isNormalWeightGain = (enrolment, encounter, toDate = new Date()) => {
    const lastEncounter = enrolment.findLastEncounterOfType(encounter, [_.get(encounter, "encounterType.name")]);
    const previousEncounterTrimester = currentTrimester(enrolment, lastEncounter && lastEncounter.encounterDateTime);
    const thisEncounterTrimester = currentTrimester(enrolment, toDate);
    const acceptableWeightGainRange = WEIGHT_GAIN_MAPPING.get(`${previousEncounterTrimester}${thisEncounterTrimester}`);
    const previousWeight = lastEncounter && lastEncounter.getObservationValue("Weight");
    const currentWeight = encounter && encounter.getObservationValue("Weight");
    return ([acceptableWeightGainRange, previousWeight, currentWeight].some(k => _.isNil(k))) ||
        (_.every([acceptableWeightGainRange, previousWeight, currentWeight], (k) => !_.isNil(k))
            && acceptableWeightGainRange.from <= (currentWeight - previousWeight)
            && (currentWeight - previousWeight) <= acceptableWeightGainRange.to);
};


let cmIncrease = (enrolment, encounter, multiplicationFactor, conceptName, toDate = new Date()) => {
    const lastEncounter = enrolment.findLastEncounterOfType(encounter, [_.get(encounter, "encounterType.name")]);
    const previousVal = lastEncounter && lastEncounter.getObservationValue(conceptName);
    const currentVal = encounter && encounter.getObservationValue(conceptName);
    const numberOfWeeksSinceLastEncounter = _.round(FormElementsStatusHelper.weeksBetween(toDate, _.get(lastEncounter, "encounterDateTime")));
    return ([previousVal, currentVal, numberOfWeeksSinceLastEncounter].some(k => _.isNil(k))) ||
        (_.every([previousVal, currentVal, numberOfWeeksSinceLastEncounter], (k) => !_.isNil(k))
            && (currentVal - previousVal) === (numberOfWeeksSinceLastEncounter * multiplicationFactor));
};

export let isNormalFundalHeightIncrease = (enrolment, encounter, toDate = new Date()) => {
    return cmIncrease(enrolment, encounter, 1, "Fundal height from pubic symphysis", toDate);
};

export let isNormalAbdominalGirthIncrease = (enrolment, encounter, toDate = new Date()) => {
    return cmIncrease(enrolment, encounter, 2.5, "Abdominal girth", toDate);
};

export const getLatestBMI = function (enrolment, currentEncounter) {
    let weight = enrolment.findLatestObservationInEntireEnrolment("Weight", currentEncounter);
    let height = enrolment.findLatestObservationInEntireEnrolment("Height", currentEncounter);
    weight = weight && weight.getValue();
    height = height && height.getValue();
    if (_.isFinite(weight) && _.isFinite(height)) {
        return C.calculateBMI(weight, height);
    }
}
