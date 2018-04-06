import {getNextScheduledVisits as nextScheduledVisits} from './motherVisitSchedule';
import * as programDecision from './motherProgramDecision';
import c from '../common';
import EnrolmentFormHandler from "./formFilters/EnrolmentFormHandler";
import FormFilterHelper from "../rules/FormFilterHelper";


export function getNextScheduledVisits (enrolment, today) {
    return nextScheduledVisits(enrolment, today);
}

export function getDecisions (enrolment, context, today) {
    if (context.usage === 'Exit')
        return {enrolmentDecisions: [], encounterDecisions: []};

    let decisions = programDecision.getDecisions(enrolment, today);
    return {enrolmentDecisions: decisions, encounterDecisions: []};
}

export function filterFormElements (programEnrolment, formElementGroup) {
    let handler = new EnrolmentFormHandler();
    return FormFilterHelper.filterFormElements(handler, programEnrolment, formElementGroup);
}


export function getEnrolmentSummary (enrolment, context, today) {
    return programDecision.getEnrolmentSummary(enrolment, context, today);
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
