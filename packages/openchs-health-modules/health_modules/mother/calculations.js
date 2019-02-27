import C from "../common";
import _ from "lodash";
import moment from 'moment';

const lmp = (programEnrolment) => {
    return programEnrolment.getObservationValue('Last menstrual period');
};

//TODO: if possible merge 'gestationalAge' and 'gestationalAgeAsOn'
const gestationalAge = (enrolment, toDate = new Date()) => C.weeksBetween(toDate, lmp(enrolment));
const gestationalAgeAsOn = (date, programEnrolment) => {
    let daysFromLMP = C.getDays(lmp(programEnrolment), date);
    return _.floor(daysFromLMP / 7, 0);
};

const gestationalAgeCategoryAsOn = (date, programEnrolment) => {
    const gestationalAge = gestationalAgeAsOn(date, programEnrolment);
    if (gestationalAge < 36) return "Very preterm";
    if (gestationalAge < 38) return "Preterm (<28 weeks)";
    return "Term (37 -38 weeks)";
};

const estimatedDateOfDelivery = (programEnrolment) => {
    return C.addDays(C.addMonths(lmp(programEnrolment), 9), 7);
};

const gestationalAgeAsOfToday = (estimatedGestationalAgeInWeeks, estimatedOnDate, today) => {
    return moment(today).diff(estimatedOnDate, 'weeks') + estimatedGestationalAgeInWeeks;
};

const gestationalAgeForEDD = (edd, asOfDate) => {
    return 40 - moment(edd).diff(asOfDate, 'weeks');
};

const eddBasedOnGestationalAge = (estimatedGestationalAgeInWeeks, estimatedOnDate) => {
    let edd = moment(estimatedOnDate).add(40 - estimatedGestationalAgeInWeeks, 'weeks');
    return edd.toDate();
};

const TRIMESTER_MAPPING = new Map([
    [1, {from: 0, to: 12}],
    [2, {from: 13, to: 28}],
    [3, {from: 29, to: Infinity}]
]);

const currentTrimester = (enrolment, toDate = new Date()) => [...TRIMESTER_MAPPING.keys()]
    .find((trimester) =>
        gestationalAge(enrolment, toDate) <= TRIMESTER_MAPPING.get(trimester).to &&
        gestationalAge(enrolment, toDate) >= TRIMESTER_MAPPING.get(trimester).from);

const get1stEncounterAfter1stTrimester = (enrolment) => {
    return _(enrolment.nonVoidedEncounters())
        .filter((en) => !_.isNil(en.findObservation('Weight')))
        .filter((en) => currentTrimester(enrolment, en.encounterDateTime) > 1)
        .sortBy('encounterDateTime')
        .first();
};

const getWeightGainRange = (enrolment, currentEncounter) => {
    const baseEncounter = get1stEncounterAfter1stTrimester(enrolment);
    const baseWeight = baseEncounter && baseEncounter.getObservationValue('Weight');
    if (_.some([baseEncounter, baseWeight], _.isNil)) {
        return {};
    }
    const noOfWeeksBetween = C.weeksBetween(currentEncounter.encounterDateTime, baseEncounter.encounterDateTime);
    const minWeightGain = noOfWeeksBetween * 1.7 / 4;
    const maxWeightGain = noOfWeeksBetween * 2 / 4;
    const absoluteWeightGain = noOfWeeksBetween * 3 / 4;
    const min = baseWeight + minWeightGain;
    const max = baseWeight + maxWeightGain;
    const absoluteMax = baseWeight + absoluteWeightGain;
    return {min, max, absoluteMax};
};

const isNormalWeightGain = (enrolment, currentEncounter) => {
    const {min, max} = getWeightGainRange(enrolment, currentEncounter);
    const currentWeight = currentEncounter && currentEncounter.getObservationValue("Weight");
    if (_.some([min, max, currentWeight], _.isNil)) {
        return true;
    }
    return min <= currentWeight && currentWeight <= max;
};

const isAbsoluteMaxWeightGain = (enrolment, currentEncounter) => {
    const {absoluteMax} = getWeightGainRange(enrolment, currentEncounter);
    const currentWeight = currentEncounter && currentEncounter.getObservationValue("Weight");
    if (_.some([absoluteMax, currentWeight], _.isNil)) {
        return false;
    }
    return currentWeight >= absoluteMax;
};
const isBelowNormalWeightGain = (enrolment, currentEncounter) => {
    const {min} = getWeightGainRange(enrolment, currentEncounter);
    const currentWeight = currentEncounter && currentEncounter.getObservationValue("Weight");
    if (_.some([min, currentWeight], _.isNil)) {
        return false;
    }
    return currentWeight < min;
};

const getOldestObsBeforeCurrentEncounter = (currentEncounter, conceptName) => {
    const {programEnrolment} = currentEncounter;
    const oldestEncounter = _.sortBy(programEnrolment.nonVoidedEncounters(), 'encounterDateTime')
        .filter(encounter => encounter.encounterDateTime <= currentEncounter.encounterDateTime)
        .find(encounter => encounter.hasObservation(conceptName));
    let oldestAbstractEncounter = oldestEncounter;
    if (_.isNil(oldestEncounter) && programEnrolment.hasObservation(conceptName)) {
        oldestAbstractEncounter = programEnrolment;
    }
    const value = oldestAbstractEncounter && oldestAbstractEncounter.getObservationReadableValue(conceptName);

    if (currentEncounter.uuid !== _.get(oldestAbstractEncounter, 'uuid')) {
        return value;
    }
    return undefined;
};

export {
    gestationalAgeAsOn,
    gestationalAgeCategoryAsOn,
    estimatedDateOfDelivery,
    gestationalAgeAsOfToday,
    eddBasedOnGestationalAge,
    isNormalWeightGain,
    isBelowNormalWeightGain,
    isAbsoluteMaxWeightGain,
    currentTrimester,
    gestationalAge,
    getOldestObsBeforeCurrentEncounter,
    gestationalAgeForEDD
};