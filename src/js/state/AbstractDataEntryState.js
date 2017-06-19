import _ from "lodash";
import RuleEvaluationService from "../service/RuleEvaluationService";
import ValidationResult from "../models/application/ValidationResult";

class AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity) {
        this.setState(validationResults, formElementGroup, wizard, isNewEntity);
    }

    clone(newState) {
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(ValidationResult.clone(validationResult));
        });
        newState.formElementGroup = this.formElementGroup;
        newState.wizard = _.isNil(this.wizard) ? this.wizard : this.wizard.clone();
        return newState;
    }

    handleValidationResult(validationResult) {
        _.remove(this.validationResults, (existingValidationResult) => existingValidationResult.formIdentifier === validationResult.formIdentifier);
        if (!validationResult.success) {
            this.validationResults.push(validationResult);
        }
    }

    handleValidationResults(validationResults) {
        validationResults.forEach((validationResult) => {
            this.handleValidationResult(validationResult);
        });
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

    handleNext(action, context) {
        const validationResults = this.validateEntity();
        const allValidationResults = _.union(validationResults, this.formElementGroup.validate(this.observationsHolder));
        this.handleValidationResults(allValidationResults);
        if (this.anyFailedResultForCurrentFEG()) {
            if (!_.isNil(action.validationFailed)) action.validationFailed(this);
        } else if (this.wizard.isLastPage() && !ValidationResult.hasNonRuleValidationError(this.validationResults)) {
            const ruleService = context.get(RuleEvaluationService);
            const validationResults = this.validateEntityAgainstRule(ruleService);
            this.handleValidationResults(validationResults);
            var decisions = [];
            var checklists;
            var nextScheduledVisits;
            if (!ValidationResult.hasValidationError(this.validationResults)) {
                decisions = this.executeRule(ruleService, context);
                checklists = this.getChecklists(ruleService, context);
                nextScheduledVisits = this.getNextScheduledVisits(ruleService, context);
            }
            action.completed(this, decisions, validationResults, checklists, nextScheduledVisits);
        } else {
            this.moveNext();
            if (!_.isNil(action.movedNext)) action.movedNext(this);
        }
        return this;
    }

    validateEntityAgainstRule(ruleService) {
        return [];
    }

    executeRule(ruleService, context) {
        return [];
    }

    getChecklists(ruleService, context) {
        return null;
    }

    getNextScheduledVisits(ruleService, context) {
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

    setState(validationResults, formElementGroup, wizard, isNewEntity) {
        this.validationResults = validationResults;
        this.formElementGroup = formElementGroup;
        this.wizard = wizard;
        this.isNewEntity = isNewEntity;
    }
}

export default AbstractDataEntryState;