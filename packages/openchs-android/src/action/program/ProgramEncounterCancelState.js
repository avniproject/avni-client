import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {ObservationsHolder, Form} from "openchs-models";

class ProgramEncounterCancelState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, programEncounter, filteredFormElements) {
        super([], formElementGroup, wizard, false, filteredFormElements);
        this.programEncounter = programEncounter;
    }

    getEntity() {
        return this.programEncounter;
    }

    getEntityType() {
        return Form.formTypes.ProgramEncounterCancellation;
    }

    static createOnLoad(programEncounter, form, formElementGroup, filteredFormElements) {
        let formElementGroupPageNumber = formElementGroup.displayOrder;
        return new ProgramEncounterCancelState(formElementGroup, new Wizard(form.numberOfPages, formElementGroupPageNumber, formElementGroupPageNumber), programEncounter, filteredFormElements);
    }

    clone() {
        return new ProgramEncounterCancelState(this.formElementGroup, this.wizard.clone(), this.programEncounter.cloneForEdit(), this.filteredFormElements);
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.cancelObservations);
    }

    validateEntity() {
        return [];
    }

    getEffectiveDataEntryDate() {
        return this.programEncounter.cancelDateTime;
    }

    getNextScheduledVisits(ruleService, context) {
        return ruleService.getNextScheduledVisits(this.getEntity(), this.getEntityType());
    }
}

export default ProgramEncounterCancelState;