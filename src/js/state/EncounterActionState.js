import _ from "lodash";
import AbstractDataEntryState from "./AbstractDataEntryState";
import AbstractEncounter from "../models/AbstractEncounter";
import ObservationsHolder from "../models/ObservationsHolder";
import Wizard from '../state/Wizard';

class EncounterActionState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity, encounter) {
        super(validationResults, formElementGroup, wizard, isNewEntity, Wizard.createNextButtonLabelKeyMap('next', 'next', 'next'));
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
        return AbstractDataEntryState.hasValidationError(state, AbstractEncounter.fieldKeys.EXTERNAL_RULE);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] : [];
    }

    static createOnLoadState(form, encounter, isNewEncounter) {
        return new EncounterActionState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1), isNewEncounter, encounter);
    }
}

export default EncounterActionState;