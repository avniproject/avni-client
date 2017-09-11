const motherVisitSchedule = require('./motherVisitSchedule');
const programDecision = require('./motherProgramDecision');
const c = require('../common');
const motherVaccinationSchedule = require('./motherVaccSchedule');

module.exports = {};

module.exports.getNextScheduledVisits = function (enrolment, today) {
    return motherVisitSchedule.getNextScheduledVisits(enrolment, today);
};

module.exports.getDecisions = function (enrolment, today) {
    var decisions = programDecision.getDecisions(enrolment, today);
    const lmpDate = enrolment.getObservationValue('Last Menstrual Period');
    const edd = c.addDays(lmpDate, 280);
    decisions.push({name:"Estimated Date of Delivery", value:edd});
    return {enrolmentDecisions: decisions, encounterDecisions: []};
};

module.exports.validate = function (programEnrolment) {
    const validationResults = [];

    if (programEnrolment.individual.gender === 'Male') {
        validationResults.push(c.createValidationError('maleCannotBeEnrolledInMotherProgram'));
    }

    if (programEnrolment.individual.getAgeInYears() < 11) {
        validationResults.push(c.createValidationError('lowerThanAgeOfBeingAMother'));
    }

    const gravida = programEnrolment.getObservationValue('Gravida');
    const parity = programEnrolment.getObservationValue('Parity');
    const number_of_abortion = programEnrolment.getObservationValue('Number of abortion');

    if(gravida !== undefined && parity !== undefined && parity > gravida){
        validationResults.push(c.createValidationError('parityCannotBeGreaterThanGravida'));
    }
    if(gravida !== undefined && number_of_abortion !== undefined && number_of_abortion > gravida){
        validationResults.push(c.createValidationError('abortionsCannotBeGreaterThanGravida'));
    }
    if(gravida !== undefined && parity !== undefined && number_of_abortion!== undefined && (parity + number_of_abortion) > gravida){
        validationResults.push(c.createValidationError('parityPlusAbortionCannotBeGreaterThanGravida'));
    }

    return validationResults;
};

module.exports.getChecklists = function (programEnrolment, today) {
    return [/*motherVaccinationSchedule.getVaccSchedule(programEnrolment)*/];
};
