import _ from 'lodash';
import {getNextScheduledVisits as nextScheduledVisits} from './motherVisitSchedule';
import * as programDecision from './motherProgramDecision';
import c from '../common';
import EnrolmentFormHandler from "./formFilters/EnrolmentFormHandler";
import {FormElementsStatusHelper} from "rules-config/rules";
import {generateRecommendations, generateReasonsForRecommendations} from './recommendations';
import {RuleFactory} from 'rules-config/rules';
import {immediateReferralAdvice} from './referral';
import {getHighRiskConditionsInEnrolment} from "./highRisk";
import {FormElementStatusBuilder} from "rules-config/rules";

const MotherEnrolmentDecision = RuleFactory("026e2f5c-8670-4e4b-9a54-cb03bbf3093d", "Decision");
const MotherEnrolmentValidation = RuleFactory("026e2f5c-8670-4e4b-9a54-cb03bbf3093d", "Validation");
const MotherEnrolmentFormFilter = RuleFactory("026e2f5c-8670-4e4b-9a54-cb03bbf3093d", "ViewFilter");
const MotherExitFormFilter = RuleFactory("e57e2f11-6684-456a-bd00-6511d9b06eaa", "ViewFilter");

@MotherEnrolmentDecision("b5882c41-1123-460d-b7e8-62d2585a510a", "Mother Program Enrolment Decision", 1.0, {})
class MotherProgramEnrolmentDecisions {
    static exec(enrolment, decisions, context={}, today) {
        return getDecisions(enrolment, context, today);
    }
}

@MotherEnrolmentFormFilter("1ca6aa7f-9379-45c8-8fde-5885f6f22cab", "Mother Enrolment Form filter", 1.0, {})
class MotherEnrolmentFormViewFilter {
    static exec(programEnrolment, formElementGroup, today) {
        return getFormElementsStatuses(programEnrolment, formElementGroup, today);
    }
}

@MotherExitFormFilter("739ea783-3350-4e73-b389-28f76d668b36", "Mother Exit Form filter", 1.0, {})
class MotherExitFormViewFilter {
    dateOfDeath(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Mother exit reason").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    deathOccurredAfterHowManyDaysOfDelivery(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Mother exit reason").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    causeOfDeath(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Mother exit reason").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    placeOfDeath(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Mother exit reason").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    _getStatusBuilder(programExit, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programExit,
            formElement
        });
    }

    static exec(programEnrolment, formElementGroup, today) {
        return FormElementsStatusHelper.getFormElementsStatuses(new MotherExitFormViewFilter(), programEnrolment, formElementGroup)
    }
}

export function getNextScheduledVisits(enrolment, config, today) {
    return nextScheduledVisits(enrolment, today);
}

export function getDecisions(enrolment, context, today) {
    if (context.usage === ProgramEnrolmentState.UsageKeys.Exit)
        return {enrolmentDecisions: [], encounterDecisions: []};

    let decisions = [];

    _addItems(decisions, programDecision.getDecisions(enrolment, today))
    _addItem(decisions, getHighRiskConditionsInEnrolment(enrolment));
    _addItem(decisions, generateRecommendations(enrolment));
    _addItems(decisions, generateReasonsForRecommendations(enrolment));
    _addItem(decisions, immediateReferralAdvice(enrolment, null, today));

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

@MotherEnrolmentValidation("7a759faf-27f2-421b-9aa1-fc6ec29a106a", "Mother Enrolment Validation Default", 1.0)
class MotherEnrolmentValidationErrors {
    static exec(programEnrolment, validationErrors) {
        return validate(programEnrolment);
    }
}

export function getChecklists(programEnrolment, today) {
    return [/*motherVaccinationSchedule.getVaccSchedule(programEnrolment)*/];
}

function _addItem(decisions, item) {
    const originalItem = _.find(decisions, {name: item.name});
    if (originalItem) {
        originalItem.value = _.union(originalItem.value, item.value);
    } else {
        decisions.push(item);
    }
}

function _addItems(decisions, items) {
    _.forEach(items, (item) => _addItem(decisions, item));
}