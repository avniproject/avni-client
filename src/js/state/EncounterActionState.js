import _ from "lodash";
import AbstractDataEntryState from "./AbstractDataEntryState";
import AbstractEncounter from "../models/AbstractEncounter";
import ObservationsHolder from "../models/ObservationsHolder";
import Wizard from '../state/Wizard';

class EncounterActionState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity, encounter) {
        super(validationResults, formElementGroup, wizard, isNewEntity, Wizard.createDefaultNextButtonLabelKeyMap('save'));
        this.encounter = encounter;
        this.encounterDecisions = null;
    }

    clone() {
        const newState = new EncounterActionState();
        newState.encounter = _.isNil(this.encounter) ? this.encounter : this.encounter.cloneForEdit();
        super.clone(newState);
        newState.encounterDecisions = null;
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.encounter.observations);
    }

    static hasOnlyExternalRuleError(state) {
        return AbstractDataEntryState.hasValidationError(state, AbstractEncounter.validationKeys.EXTERNAL_RULE);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.validationKeys.ENCOUNTER_DATE_TIME] : [];
    }
}

export default EncounterActionState;