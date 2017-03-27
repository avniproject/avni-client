import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import ObservationsHolder from "../../models/ObservationsHolder";

class ProgramEncounterState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, programEncounter, nextButtonLabelKeyMap) {
        super([], formElementGroup, wizard, isNewEntity, nextButtonLabelKeyMap);
        this.programEncounter = programEncounter;
    }

    static createOnLoad(programEncounter, form, isNewEntity) {
        return new ProgramEncounterState(form.firstFormElementGroup, new Wizard(form.numberOfPages, 1), isNewEntity, programEncounter, Wizard.createDefaultNextButtonLabelKeyMap('save'));
    }

    clone() {
        return new ProgramEncounterState(this.formElementGroup, this.wizard, this.isNewEntity, this.programEncounter.cloneForEdit(), this.nextButtonLabelMap);
    }

    reset() {
        super.reset();
        this.programEncounter = null;
        return this;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.observations);
    }

    validateEntity() {
        return this.programEncounter.validate();
    }

    get staticFormElementIds() {
        return [];
    }
}

export default ProgramEncounterState;