import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {ObservationsHolder, ProgramEncounter} from "openchs-models";

class ProgramEncounterCancelState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, programEncounter, filteredFormElements) {
        super([], formElementGroup, wizard, false, filteredFormElements);
        this.programEncounter = programEncounter;
    }

    getEntity() {
        return this.programEncounter;
    }

    getEntityType() {
        return ProgramEncounter.schema.name;
    }

    static createOnLoad(programEncounter, form, formElementGroup, filteredFormElements) {
        let formElementGroupPageNumber = formElementGroup.displayOrder;
        return new ProgramEncounterCancelState(formElementGroup, new Wizard(form.numberOfPages, formElementGroupPageNumber, formElementGroupPageNumber), programEncounter, filteredFormElements);
    }

    clone() {
        let programEncounterCancelState = new ProgramEncounterCancelState(this.formElementGroup, this.wizard.clone(), this.programEncounter.cloneForEdit(), this.filteredFormElements);
        return programEncounterCancelState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.cancelObservations);
    }

    validateEntity() {
        return [];
    }
}

export default ProgramEncounterCancelState;