import { FormElementsStatusHelper } from "rules-config/rules";
import _ from "lodash";
import C from '../common';
export { isNormalWeightGain, currentTrimester, gestationalAge } from './calculations';

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
