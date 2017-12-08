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
    const lmpConceptName = 'Last Menstrual Period';

    const encounters = [];

    const lmpDate = programEnrolment.getObservationValue(lmpConceptName);

    const matchingEncounter = function(encounters, encounterTypeName, encounterName) {
        return encounters.find(function(encounter) {
            return encounter.encounterType.name === encounterTypeName && encounter.name === encounterName;
        })
    };

    const currentEncounters = programEnrolment.encounters;

    const deliveryEncounter = matchingEncounter(currentEncounters, 'Delivery', 'Delivery');

    const deliveryDate = deliveryEncounter && deliveryEncounter.encounterDateTime;
    console.log("Delivery encounter is " + deliveryEncounter);
    console.log("Delivery date is " + deliveryDate);

    const addEncounter = function (baseDate, encounterType, name) {
        if (_.encounterExists(currentEncounters, encounterType, name)) return;

        var schedule = encounterSchedule[name === undefined ? encounterType : name];

        encounters.push({
            name: name,
            encounterType: encounterType,
            earliestDate: _.addDays(baseDate, schedule.earliest),
            maxDate: _.addDays(baseDate, schedule.max)
        });
    };

    if (lmpDate) {
        addEncounter(lmpDate, 'ANC', 'ANC 1');
        addEncounter(lmpDate, 'ANC', 'ANC 2');
        addEncounter(lmpDate, 'ANC', 'ANC 3');
        addEncounter(lmpDate, 'ANC', 'ANC 4');
        addEncounter(lmpDate, 'Delivery', 'Delivery');
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
