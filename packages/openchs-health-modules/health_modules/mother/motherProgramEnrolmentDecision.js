import {getNextScheduledVisits as nextScheduledVisits} from './motherVisitSchedule';
import * as programDecision from './motherProgramDecision';
import c from '../common';
import EnrolmentFormHandler from "./formFilters/EnrolmentFormHandler";
import FormElementsStatusHelper from "../../../rules-config/src/rules/FormElementsStatusHelper";
import generateRecommendations from './recommendations';
import {referralAdvice, immediateReferralAdvice} from './referral';
import {getHighRiskConditionsInEnrolment} from "./highRisk";


export function getNextScheduledVisits(enrolment, config, today) {
    return nextScheduledVisits(enrolment, today);
}

export function getDecisions(enrolment, context, today) {
    if (context.usage === 'Exit')
        return {enrolmentDecisions: [], encounterDecisions: []};

    let decisions = programDecision.getDecisions(enrolment, today);
    decisions = decisions.concat(getHighRiskConditionsInEnrolment(enrolment));
    decisions = decisions.concat(generateRecommendations(enrolment));
    decisions = decisions.concat(immediateReferralAdvice(enrolment, null, today));
    return {enrolmentDecisions: decisions, encounterDecisions: []};
}

export function getFormElementsStatuses(programEnrolment, formElementGroup) {
    let handler = new EnrolmentFormHandler();
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEnrolment, formElementGroup);
}


export function getEnrolmentSummary(enrolment, context, today) {
    return programDecision.getEnrolmentSummary(enrolment, context, today);
}

export function validate(programEnrolment) {
    const validationResults = [];

    if (programEnrolment.individual.gender === 'Male') {
        validationResults.push(c.createValidationError('maleCannotBeEnrolledInMotherProgram'));
    }

    if (programEnrolment.individual.getAgeInYears() < 11) {
        validationResults.push(c.createValidationError('lowerThanAgeOfBeingAMother'));
    }

    const gravida = programEnrolment.getObservationValue('Gravida');
    const parity = programEnrolment.getObservationValue('Parity');
    const number_of_abortion = programEnrolment.getObservationValue('Number of abortions');

    if (gravida !== undefined && parity !== undefined && parity > gravida) {
        validationResults.push(c.createValidationError('parityCannotBeGreaterThanGravida'));
    }
    if (gravida !== undefined && number_of_abortion !== undefined && number_of_abortion > gravida) {
        validationResults.push(c.createValidationError('abortionsCannotBeGreaterThanGravida'));
    }
    if (gravida !== undefined && parity !== undefined && number_of_abortion !== undefined && (parity + number_of_abortion) > gravida) {
        validationResults.push(c.createValidationError('parityPlusAbortionCannotBeGreaterThanGravida'));
    }

    return validationResults;
}

export function getChecklists(programEnrolment, today) {
    return [/*motherVaccinationSchedule.getVaccSchedule(programEnrolment)*/];
}
