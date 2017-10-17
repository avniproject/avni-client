import {getNextScheduledVisits as nextScheduledVisits} from './motherVisitSchedule';
import * as programDecision from './motherProgramDecision';
import c from '../common';

export function getNextScheduledVisits (enrolment, today) {
    return nextScheduledVisits(enrolment, today);
}

export function getDecisions (enrolment, today) {
    var decisions = programDecision.getDecisions(enrolment, today);
    const lmpDate = enrolment.getObservationValue('Last Menstrual Period');
    const edd = c.addDays(lmpDate, 280);
    decisions.push({name:"Estimated Date of Delivery", value:edd});
    return {enrolmentDecisions: decisions, encounterDecisions: []};
}

export function validate (programEnrolment) {
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
}

export function getChecklists (programEnrolment, today) {
    return [/*motherVaccinationSchedule.getVaccSchedule(programEnrolment)*/];
}
