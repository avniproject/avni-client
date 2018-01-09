import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {ObservationsHolder, ProgramEncounter} from "openchs-models";

class ProgramEncounterCancelState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, programEncounter) {
        super([], formElementGroup, wizard, false, formElementGroup.getFormElements());
        this.programEncounter = programEncounter;
    }

    getEntity() {
        return this.programEncounter;
    }

    getEntityType() {
        return ProgramEncounter.schema.name;
    }

    static createOnLoad(programEncounter, form, formElementGroup) {
        let formElementGroupPageNumber = form.formElementGroups.indexOf(formElementGroup)+ 1;
        return new ProgramEncounterCancelState(formElementGroup, new Wizard(form.numberOfPages, formElementGroupPageNumber, formElementGroupPageNumber), programEncounter);
    }

    clone() {
        let programEncounterCancelState = new ProgramEncounterCancelState(this.formElementGroup, this.wizard.clone(), this.programEncounter.cloneForEdit());
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