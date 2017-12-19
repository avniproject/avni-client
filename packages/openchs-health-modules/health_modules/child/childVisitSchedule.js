import C from '../common';

//in days
var visitSchedule = {
    "PNC 1": {earliest: 1, max: 1},
    "PNC 2": {earliest: 3, max: 3},
    "PNC 3": {earliest: 7, max: 7},
    "PNC 4": {earliest: 42, max: 42}
};

var getNextScheduledVisits = function (programEnrolment) {
    var observations = programEnrolment.observations;
    var encounters = programEnrolment.encounters;

    let dateOfBirth = programEnrolment.individual.dateOfBirth;

    if (C.encounterExists(encounters, 'PNC', 'PNC 4')) return null;
    if (C.encounterExists(encounters, 'PNC', 'PNC 3')) return createNextVisit(dateOfBirth, 'PNC 4');
    if (C.encounterExists(encounters, 'PNC', 'PNC 2')) return createNextVisit(dateOfBirth, 'PNC 3');
    if (C.encounterExists(encounters, 'PNC', 'PNC 1')) return createNextVisit(dateOfBirth, 'PNC 2');
    return createNextVisit(dateOfBirth, 'PNC 1');

    function createNextVisit(baseDate, name) {
        var schedule = visitSchedule[name];
        return {
            name: name,
            earliestDate: C.addDays(C.copyDate(baseDate), schedule.earliest),
            maxDate: C.addDays(C.copyDate(baseDate), schedule.max)
        };
    }
};

export {getNextScheduledVisits};
