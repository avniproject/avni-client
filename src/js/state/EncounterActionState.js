import _ from "lodash";
import ValidationResult from "../models/application/ValidationResult";

class EncounterActionState {
    constructor() {
        this.formElementGroup = null;
        this.encounter = null;
        this.validationResults = [];
        this.encounterDecisions = null;
    }

    clone() {
        const newState = new EncounterActionState();
        newState.encounter = this.encounter.cloneForNewEncounter();
        newState.formElementGroup = this.formElementGroup;
        newState.validationResults = [];
        this.validationResults.forEach((validationResult) => {
            newState.validationResults.push(validationResult.clone());
        });
        newState.encounterDecisions = null;
        return newState;
    }

    handleValidationResult(validationResult, formElementUUID) {
        if (validationResult.success) {
            _.remove(this.validationResults, (existingValidationResult) => existingValidationResult.formElementUUID === formElementUUID);
        } else {
            const existingValidationResult = _.find(this.validationResults, (validationResult) => formElementUUID === validationResult.formElementUUID);
            if (_.isNil(existingValidationResult)) {
                this.validationResults.push(new ValidationResult(formElementUUID, validationResult.message));
            } else {
                existingValidationResult.message = validationResult.message;
            }
        }
    }
}

export default EncounterActionState;