import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import ObservationsHolder from "../../models/ObservationsHolder";
import AbstractEncounter from "../../models/AbstractEncounter";
import _ from 'lodash';

class ProgramEncounterState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, programEncounter, nextButtonLabelKeyMap) {
        super([], formElementGroup, wizard, isNewEntity, nextButtonLabelKeyMap);
        this.programEncounter = programEncounter;
    }

    static createOnLoad(programEncounter, form, isNewEntity) {
        return new ProgramEncounterState(form.firstFormElementGroup, new Wizard(form.numberOfPages, 1), isNewEntity, programEncounter, Wizard.createDefaultNextButtonLabelKeyMap('save'));
    }

    clone() {
        return new ProgramEncounterState(this.formElementGroup, this.wizard.clone(), this.isNewEntity, this.programEncounter.cloneForEdit(), this.nextButtonLabelMap);
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.observations);
    }

    validateEntity() {
        return this.programEncounter.validate();
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.validationKeys.ENCOUNTER_DATE_TIME] : [];
    }

    static hasEncounterChanged(state, programEncounter) {
        if (_.isNil(state.programEncounter)) return true;
        return state.programEncounter.uuid === programEncounter.uuid;
    }
}

export default ProgramEncounterState;