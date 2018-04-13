import _ from '../common';

//in days
const encounterSchedule = {
    "ANC 1": {earliest: 40, max: 84},
    "ANC 2": {earliest: 98, max: 182},
    "ANC 3": {earliest: 196, max: 238},
    "ANC 4": {earliest: 252, max: 273},
    "Delivery": {earliest: 270, max: 280},
    "PNC 1": {earliest: 1, max: 1},
    "PNC 2": {earliest: 3, max: 3},
    "PNC 3": {earliest: 7, max: 7},
    "PNC 4": {earliest: 42, max: 42}
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {
    const lmpConceptName = 'Last menstrual period';

    const encounters = [];

    const lmpDate = programEnrolment.getObservationValue(lmpConceptName);

    const deliveryEncounter = programEnrolment.findEncounter('Delivery', 'Delivery');

    const deliveryDate = deliveryEncounter && deliveryEncounter.encounterDateTime;

    const addEncounter = function (baseDate, encounterType, name) {
        if (programEnrolment.hasEncounter(encounterType, name)) return;
        var schedule = encounterSchedule[name === undefined ? encounterType : name];
        encounters.push({
            name: name,
            encounterType: encounterType,
            earliestDate: _.addDays(baseDate, schedule.earliest),
            maxDate: _.addDays(baseDate, schedule.max)
        });
    };

    if (lmpDate) {
    }

    if (deliveryDate) {
        addEncounter(deliveryDate, 'PNC', 'PNC 1');
        addEncounter(deliveryDate, 'PNC', 'PNC 2');
        addEncounter(deliveryDate, 'PNC', 'PNC 3');
        addEncounter(deliveryDate, 'PNC', 'PNC 4');
    }

    return encounters;
};

export {getNextScheduledVisits};
