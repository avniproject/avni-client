import _ from "lodash";
import ProgramEncounter from '../../models/ProgramEncounter';
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";

class ProgramEncounterState extends AbstractDataEntryState {
    constructor(individual, form, ) {
        super([], form.firstFormElementGroup, new Wizard(form.numberOfPages, 1));
        this.individual = individual;
        this.encounter = ProgramEncounter.createSafeInstance();
    }
}

export default ProgramEncounterState;