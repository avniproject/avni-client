import _ from "lodash";

class AbstractDataEntryState {
    constructor() {
        this.validationResults = [];
        this.formElementGroup = null;
    }

    clone(newState) {
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(validationResult.clone());
        });
        newState.formElementGroup = this.formElementGroup;
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

    moveNext(getForm) {
        this.wizard.moveNext();
        if (this.wizard.isFirstFormPage()) {
            const form = getForm();
            this.formElementGroup = form.formElementGroups[0];
        } else {
            this.formElementGroup = this.formElementGroup.next();
        }
    }

    movePrevious() {
        this.wizard.movePrevious();
        if (!this.wizard.isNonFormPage()) {
            this.formElementGroup = this.formElementGroup.previous();
        }
    }
}

export default AbstractDataEntryState;