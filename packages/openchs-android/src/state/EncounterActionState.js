import _ from "lodash";
import AbstractDataEntryState from "./AbstractDataEntryState";
import {AbstractEncounter, ObservationsHolder} from "openchs-models";
import Wizard from "./Wizard";
import ConceptService from "../service/ConceptService";
import {Encounter} from "openchs-models";

class EncounterActionState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity, encounter, filteredFormElements) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements);
        this.encounter = encounter;
        this.previousEncountersDisplayed = false;
    }

    getEntity() {
        return this.encounter;
    }

    getEntityType() {
        return Encounter.schema.name;
    }

    clone() {
        const newState = new EncounterActionState();
        newState.encounter = _.isNil(this.encounter) ? this.encounter : this.encounter.cloneForEdit();
        newState.previousEncountersDisplayed = this.previousEncountersDisplayed;
        if(newState.previousEncountersDisplayed){
            newState.previousEncounters = this.previousEncounters;
        }
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.encounter.observations);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] : [];
    }

    static createOnLoadState(form, encounter, isNewEncounter, filteredFormElements) {
        return new EncounterActionState([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1), isNewEncounter, encounter, filteredFormElements);
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.encounter, this.formElementGroup.form, 'Encounter');
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.encounter, 'Encounter');
        context.get(ConceptService).addDecisions(this.encounter.observations, decisions.encounterDecisions);

        return decisions;
    }

    validateEntity() {
        return this.encounter.validate();
    }
}

export default EncounterActionState;