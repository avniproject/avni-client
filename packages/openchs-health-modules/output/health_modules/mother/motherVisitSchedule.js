const _ = require('../common');

//in days
const encounterSchedule = {
    "ANC 1": {due: 40, max: 84},
    "ANC 2": {due: 98, max: 182},
    "ANC 3": {due: 196, max: 238},
    "ANC 4": {due: 252, max: 273},
    "Delivery": {due: 270, max: 280},
    "PNC 1": {due: 1, max: 1},
    "PNC 2": {due: 3, max: 3},
    "PNC 3": {due: 7, max: 7},
    "PNC 4": {due: 42, max: 42}
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
            dueDate: _.addDays(baseDate, schedule.due),
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

module.exports = {
    getNextScheduledVisits: getNextScheduledVisits
};

