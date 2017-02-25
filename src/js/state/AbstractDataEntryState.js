import _ from "lodash";

class AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard) {
        this.validationResults = validationResults;
        this.formElementGroup = formElementGroup;
        this.wizard = wizard;
    }

    clone(newState) {
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(validationResult.clone());
        });
        newState.formElementGroup = this.formElementGroup;
        newState.wizard = _.isNil(this.wizard) ? this.wizard : this.wizard.clone();
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
        if (!this.wizard.isNonFormPage()) {
            this.formElementGroup = this.formElementGroup.previous();
        }
    }

    get observationsHolder() {}

    handleNext(action, saveFn) {
        const validationResults = _.union(this.observationsHolder.validate(), this.formElementGroup.validateMandatoryFields(this.observationsHolder));
        this.handleValidationResults(validationResults);
        if (this.validationResults.length !== 0 && this.wizard.isLastPage()) {
            action.validationFailed();
        } else if (this.wizard.isLastPage()) {
            saveFn(this.individual);
            action.saved();
        } else if (this.validationResults.length === 0) {
            this.moveNext();
            action.movedNext();
        }
        return this;
    }

    static getValidationError(state, formElementIdentifier) {
        return _.find(state.validationResults, (validationResult) => validationResult.formIdentifier === formElementIdentifier);
    }

    static hasValidationError(state, formElementIdentifier) {
        const validationError = AbstractDataEntryState.getValidationError(state, formElementIdentifier);
        return !_.isNil(validationError);
    }
}

export default AbstractDataEntryState;