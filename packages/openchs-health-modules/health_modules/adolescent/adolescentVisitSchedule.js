import _ from '../common';

const encounterSchedule = {
    "Monthly Visit": {earliest: 30, max: 40},
    "Quarterly Visit": {earliest: 90, max: 100},
    "Half Yearly Visit": {earliest: 180, max: 190},
    "Annual Visit": {earliest: 360, max: 370}
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {
    return [];
};

export {getNextScheduledVisits};
