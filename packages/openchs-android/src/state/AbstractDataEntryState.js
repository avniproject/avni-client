import _ from "lodash";
import RuleEvaluationService from "../service/RuleEvaluationService";
import {ValidationResult, BaseEntity} from "openchs-models";
import General from "../utility/General";
import ObservationHolderActions from "../action/common/ObservationsHolderActions";
import SettingsService from "../service/SettingsService";

class AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements) {
        this.setState(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, {});
    }

    clone(newState) {
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(ValidationResult.clone(validationResult));
        });
        newState.formElementGroup = this.formElementGroup;
        newState.filteredFormElements = this.filteredFormElements;
        newState.wizard = _.isNil(this.wizard) ? this.wizard : this.wizard.clone();
        newState.formElementsUserState = this.formElementsUserState;
        return newState;
    }

    getEntity() {
        throw new Error("getEntity should be overridden");
    }

    getEntityType() {
        throw new Error("getEntityType should be overridden");
    }

    handleValidationResult(validationResult) {
        _.remove(this.validationResults, (existingValidationResult) => existingValidationResult.formIdentifier === validationResult.formIdentifier);
        if (!validationResult.success) {
            this.validationResults.push(validationResult);
        }
    }

    handleValidationResults(validationResults, context) {
        const settings = context.get(SettingsService).getSettings();
        if (!settings.devSkipValidation) {
            validationResults.forEach((validationResult) => {
                this.handleValidationResult(validationResult);
            });
        }
    }

    moveNext() {
        this.wizard.moveNext();
        this.formElementGroup = this.formElementGroup.next();
    }

    movePrevious() {
        this.wizard.movePrevious();
        this.formElementGroup = this.formElementGroup.previous();
    }

    get observationsHolder() {
        throw Error('Should be overridden');
    }

    get hasValidationError() {
        return this.validationResults.some((validationResult) => !validationResult.success);
    }

    removeNonRuleValidationErrors() {
        _.remove(this.validationResults, (validationResult) => validationResult.formIdentifier === BaseEntity.fieldKeys.EXTERNAL_RULE)
    }

    handlePrevious(action, context) {
        this.movePrevious();

        ObservationHolderActions.updateFormElements(this.formElementGroup, this, context);
        this.observationsHolder.removeNonApplicableObs(this.formElementGroup.getFormElements(), this.filteredFormElements);

        if (this.hasNoFormElements() && !this.wizard.isFirstPage()) {
            General.logDebug("No form elements here. Moving to previous screen");
            return this.handlePrevious(action, context);
        }

        if (!(_.isNil(action) || _.isNil(action.cb)))
            action.cb(this);
        return this;
    }

    handleNext(action, context) {
        const ruleService = context.get(RuleEvaluationService);
        const validationResults = this.validateEntity();
        const allValidationResults = _.union(validationResults, this.formElementGroup.validate(this.observationsHolder, this.filteredFormElements));
        this.handleValidationResults(allValidationResults, context);
        if (this.anyFailedResultForCurrentFEG()) {
            if (!_.isNil(action.validationFailed)) action.validationFailed(this);
        } else if (this.wizard.isLastPage()) {
            this.moveToLastPageWithFormElements(action, context);
            this.removeNonRuleValidationErrors();
            const validationResults = this.validateEntityAgainstRule(ruleService);
            this.handleValidationResults(validationResults, context);
            let decisions, checklists, nextScheduledVisits;
            if (!ValidationResult.hasValidationError(this.validationResults)) {
                decisions = this.executeRule(ruleService, context);
                checklists = this.getChecklists(ruleService, context);
                nextScheduledVisits = this.getNextScheduledVisits(ruleService, context);
            }
            action.completed(this, decisions, validationResults, checklists, nextScheduledVisits);
        } else {
            this.moveNext();
            const formElementStatuses = ObservationHolderActions.updateFormElements(this.formElementGroup, this, context);
            this.observationsHolder.removeNonApplicableObs(this.formElementGroup.getFormElements(), this.filteredFormElements);
            this.observationsHolder.updatePrimitiveObs(this.filteredFormElements, formElementStatuses);
            if (this.hasNoFormElements()) {
                General.logDebug("No form elements here. Moving to next screen");
                return this.handleNext(action, context);
            }
            if (_.isFunction(action.movedNext)) action.movedNext(this);
        }
        return this;
    }

    moveToLastPageWithFormElements(action, context) {
        while (this.hasNoFormElements() && !this.wizard.isFirstPage()) {
            this.handlePrevious(action, context);
        }
    }

    validateEntityAgainstRule(ruleService) {
        return [];
    }

    executeRule(ruleService, context) {
        return {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
    }

    getChecklists(ruleService, context) {
        return null;
    }

    validateEntity() {
        throw Error('Should be overridden');
    }

    static getValidationError(state, formElementIdentifier) {
        return _.find(state.validationResults, (validationResult) => validationResult.formIdentifier === formElementIdentifier);
    }

    static hasValidationError(state, formElementIdentifier) {
        const validationError = AbstractDataEntryState.getValidationError(state, formElementIdentifier);
        return !_.isNil(validationError);
    }

    anyFailedResultForCurrentFEG() {
        const formUUIDs = _.union(this.formElementGroup.formElementIds, this.staticFormElementIds);
        return _.some(this.validationResults, (validationResult) => {
            return validationResult.success === false && formUUIDs.indexOf(validationResult.formIdentifier) !== -1;
        });
    }

    get staticFormElementIds() {
        return [];
    }

    setState(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, formElementsUserState) {
        this.validationResults = validationResults;
        this.formElementGroup = formElementGroup;
        this.wizard = wizard;
        this.isNewEntity = isNewEntity;
        this.filteredFormElements = filteredFormElements;
        this.formElementsUserState = formElementsUserState;
    }

    hasNoFormElements() {
        return _.isEmpty(this.filteredFormElements);
    }


    getNextScheduledVisits(ruleService, context) {
        return null;
    }

    getEffectiveDataEntryDate() {
        throw Error('This method should be overridden');
    }
}

export default AbstractDataEntryState;