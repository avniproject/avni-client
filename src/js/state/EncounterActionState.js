import _ from "lodash";
import ValidationResult from "../models/application/ValidationResult";
import AbstractDataEntryState from "./AbstractDataEntryState";

class EncounterActionState extends AbstractDataEntryState {
    constructor() {
        super();
        this.encounter = null;
        this.encounterDecisions = null;
    }

    clone() {
        const newState = new EncounterActionState();
        newState.encounter = this.encounter.cloneForNewEncounter();
        super.clone(newState);
        newState.encounterDecisions = null;
        newState.wizard = this.wizard.clone();
        return newState;
    }
}

export default EncounterActionState;