import { FormElementsStatusHelper } from "rules-config/rules";
import _ from "lodash";
import C from '../common';
const { weeksBetween } = FormElementsStatusHelper;

const TRIMESTER_MAPPING = new Map([
    [1, { from: 0, to: 12 }],
    [2, { from: 13, to: 28 }],
    [3, { from: 29, to: 40 }]
]);

export let gestationalAge = (enrolment, toDate = new Date()) => weeksBetween(toDate,
    enrolment.getObservationValue("Last menstrual period"));

export let currentTrimester = (enrolment, toDate = new Date()) => [...TRIMESTER_MAPPING.keys()]
    .find((trimester) =>
        gestationalAge(enrolment, toDate) <= TRIMESTER_MAPPING.get(trimester).to &&
        gestationalAge(enrolment, toDate) >= TRIMESTER_MAPPING.get(trimester).from);

const get1stEncounterAfter1stTrimester = (enrolment, encounterType) => {
    return _(enrolment.encounters)
        .filter((en) => _.get(en, "encounterType.name") === encounterType)
        .filter((en) => currentTrimester(enrolment, en.encounterDateTime) > 1)
        .sortBy('encounterDateTime')
        .first();
}

export let isNormalWeightGain = (enrolment, currentEncounter) => {
    const baseEncounter = get1stEncounterAfter1stTrimester(enrolment, _.get(currentEncounter, "encounterType.name"));
    const baseWeight = baseEncounter && baseEncounter.getObservationValue('Weight');
    const currentWeight = currentEncounter && currentEncounter.getObservationValue("Weight");
    if (_.some([baseEncounter, currentEncounter, baseWeight, currentWeight], _.isNil)) {
        return true;
    }

    const noOfWeeksBetween = weeksBetween(currentEncounter.encounterDateTime, baseEncounter.encounterDateTime);
    const minWeightGain = noOfWeeksBetween * 1.7 / 4;
    const maxWeightGain = noOfWeeksBetween * 2 / 4;
    const lowerBound = baseWeight + minWeightGain;
    const upperBound = baseWeight + maxWeightGain;
    return lowerBound <= currentWeight && currentWeight <= upperBound;
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
