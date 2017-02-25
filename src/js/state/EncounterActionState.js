import _ from "lodash";
import ValidationResult from "../models/application/ValidationResult";
import AbstractDataEntryState from "./AbstractDataEntryState";

class EncounterActionState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard) {
        super(validationResults, formElementGroup, wizard);
        this.encounter = null;
        this.encounterDecisions = null;
    }

    clone() {
        const newState = new EncounterActionState();
        newState.encounter = _.isNil(this.encounter) ? this.encounter : this.encounter.cloneForNewEncounter();
        super.clone(newState);
        newState.encounterDecisions = null;
        return newState;
    }

    get observationsHolder() {
        return this.encounter;
    }
}

export default EncounterActionState;