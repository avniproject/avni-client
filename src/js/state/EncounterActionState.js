import _ from "lodash";
import AbstractDataEntryState from "./AbstractDataEntryState";
import Encounter from "../models/Encounter";

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

    static hasOnlyExternalRuleError(state) {
        return AbstractDataEntryState.hasValidationError(state, Encounter.validationKeys.EXTERNAL_RULE);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [Encounter.validationKeys.ENCOUNTER_DATE_TIME] : [];
    }
}

export default EncounterActionState;