import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import ObservationsHolder from "../../models/ObservationsHolder";
import AbstractEncounter from "../../models/AbstractEncounter";
import _ from "lodash";
import ProgramEncounter from '../../models/ProgramEncounter';

class ProgramEncounterState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, programEncounter, observationRules, filteredFormElements) {
        super([], formElementGroup, wizard, isNewEntity);
        this.programEncounter = programEncounter;
        this.observationRules = observationRules;
        this.filteredFormElements = filteredFormElements;
    }

    static createOnLoad(programEncounter, form, isNewEntity, observationRules) {
        const formElementGroup = form.firstFormElementGroup;
        return new ProgramEncounterState(formElementGroup, new Wizard(form.numberOfPages, 1), isNewEntity, programEncounter, observationRules, formElementGroup.getApplicableFormElements(programEncounter, observationRules));
    }

    clone() {
        return new ProgramEncounterState(this.formElementGroup, this.wizard.clone(), this.isNewEntity, this.programEncounter.cloneForEdit(), this.observationRules, this.filteredFormElements);
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.observations);
    }

    validateEntity() {
        return this.programEncounter.validate();
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] : [];
    }

    static hasEncounterChanged(state, programEncounter) {
        if (_.isNil(state.programEncounter)) return true;
        return state.programEncounter.uuid !== programEncounter.uuid;
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.programEncounter, this.formElementGroup.form, ProgramEncounter.schema.name);
    }

    executeRule(ruleService, context) {
        return ruleService.getDecisions(this.programEncounter, ProgramEncounter.schema.name);
    }

    getNextScheduledVisits(ruleService, context) {
        return ruleService.getNextScheduledVisits(this.programEncounter, ProgramEncounter.schema.name);
    }

    moveNext() {
        super.moveNext();
        this.filteredFormElements = this.formElementGroup.getApplicableFormElements(this.programEncounter, this.observationRules);
    }

    movePrevious() {
        super.movePrevious();
        this.filteredFormElements = this.formElementGroup.getApplicableFormElements(this.programEncounter, this.observationRules);
    }
}

export default ProgramEncounterState;