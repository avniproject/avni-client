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

    handleValidationResult(validationResult) {
        _.remove(this.validationResults, (existingValidationResult) => existingValidationResult.formElementUUID === validationResult.formElementUUID);
        if (!validationResult.success) {
            this.validationResults.push(validationResult);
        }
    }

    handleValidationResults(validationResults) {
        validationResults.forEach((validationResult) => {
            this.handleValidationResult(validationResult);
        });
    }
}

export default EncounterActionState;