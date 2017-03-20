import _ from "lodash";

class AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard) {
        this.setState(validationResults, formElementGroup, wizard);
    }

    clone(newState) {
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(validationResult.clone());
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

    get observationsHolder() {}

    handleNext(action, validationResults, completionFn) {
        const allValidationResults = _.union(validationResults, this.formElementGroup.validate(this.observationsHolder));
        this.handleValidationResults(allValidationResults);
        if (this.anyFailedResultForCurrentFEG()) {
            action.validationFailed(this);
        } else if (this.validationResults.length === 0 && this.wizard.isLastPage()) {
            completionFn();
            action.completed(this);
        } else {
            this.moveNext();
            action.movedNext(this);
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

    anyFailedResultForCurrentFEG() {
        const formUUIDs = _.union(this.formElementGroup.formElementIds, this.staticFormElementIds);
        return _.some(this.validationResults, (validationResult) => {
            return validationResult.success === false && formUUIDs.indexOf(validationResult.formIdentifier) != -1;
        });
    }

    get staticFormElementIds() {
        return [];
    }

    reset() {
        this.setState([], null, null);
    }

    setState(validationResults, formElementGroup, wizard) {
        this.validationResults = validationResults;
        this.formElementGroup = formElementGroup;
        this.wizard = wizard;
    }
}

export default AbstractDataEntryState;