import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import _ from 'lodash';
import ObservationsHolder from "../../models/ObservationsHolder";

class ProgramEncounterState extends AbstractDataEntryState {
    constructor(programEncounter, form) {
        super([], _.isNil(form) ? null : form.firstFormElementGroup, _.isNil(form) ? null : new Wizard(form.numberOfPages, 1));
        this.programEncounter = programEncounter;
    }

    clone() {
        const programEncounterState = new ProgramEncounterState();
        super.clone(programEncounterState);
        programEncounterState.programEncounter = this.programEncounter.cloneForEdit();
        return programEncounterState;
    }

    reset() {
        super.reset();
        this.programEncounter = null;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.observations);
    }

    validateEntity() {
        return this.programEncounter.validate();
    }
}

export default ProgramEncounterState;