import childVaccinationSchedule from './childVaccSchedule';

const getDecisions = function (programEnrolment, today) {
    return {enrolmentDecisions: [], encounterDecisions: []};
};

const getChecklists = function (programEnrolment, today) {
    return [childVaccinationSchedule.getVaccSchedule(programEnrolment)];
};

export {
    getDecisions,
    getChecklists
};