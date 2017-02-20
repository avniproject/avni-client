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

    moveNext() {
        const formElementGroup = this.formElementGroup.next();
        if (!_.isNil(formElementGroup))
            this.formElementGroup = formElementGroup;
    }

    movePrevious() {
        this.formElementGroup = this.formElementGroup.previous();
    }
}

export default AbstractDataEntryState;