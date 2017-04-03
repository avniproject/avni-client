import _ from "lodash";
import AbstractDataEntryState from "./AbstractDataEntryState";
import AbstractEncounter from "../models/AbstractEncounter";
import ObservationsHolder from "../models/ObservationsHolder";
import Wizard from '../state/Wizard';
import IndividualEncounterService from "../service/IndividualEncounterService";

class EncounterActionState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity, encounter) {
        super(validationResults, formElementGroup, wizard, isNewEntity);
        this.encounter = encounter;
    }

    clone() {
        const newState = new EncounterActionState();
        newState.encounter = _.isNil(this.encounter) ? this.encounter : this.encounter.cloneForEdit();
        newState.form = this.form;
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.encounter.observations);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] : [];
    }

    static createOnLoadState(form, encounter, isNewEncounter) {
        const encounterActionState = new EncounterActionState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1), isNewEncounter, encounter);
        encounterActionState.form = form;
        return encounterActionState;
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateEncounter(this.encounter);
    }

    executeRule(ruleService, context) {
        const encounterDecisions = ruleService.getEncounterDecision(this.encounter);
        context.get(IndividualEncounterService).addDecisions(this.encounter, encounterDecisions);
        return encounterDecisions;
    }

    validateEntity() {
        return this.encounter.validate();
    }
}

export default EncounterActionState;