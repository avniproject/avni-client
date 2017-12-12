import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {ObservationsHolder, AbstractEncounter, ProgramEncounter} from "openchs-models";
import _ from "lodash";
import ConceptService from "../../service/ConceptService";

class ProgramEncounterState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, programEncounter, filteredFormElements) {
        super([], formElementGroup, wizard, isNewEntity);
        this.programEncounter = programEncounter;
        this.filteredFormElements = filteredFormElements;
    }

    getEntity() {
        return this.programEncounter;
    }

    static createOnLoad(programEncounter, form, isNewEntity, formElementGroup, filteredFormElements) {
        return new ProgramEncounterState(formElementGroup, new Wizard(form.numberOfPages, 1), isNewEntity, programEncounter, filteredFormElements);
    }

    clone() {
        return new ProgramEncounterState(this.formElementGroup, this.wizard.clone(), this.isNewEntity, this.programEncounter.cloneForEdit(), this.filteredFormElements);
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

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.programEncounter, this.formElementGroup.form, ProgramEncounter.schema.name);
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.programEncounter, ProgramEncounter.schema.name);
        context.get(ConceptService).addDecisions(this.programEncounter.observations, decisions.encounterDecisions);

        const enrolment = this.programEncounter.programEnrolment.cloneForEdit();
        context.get(ConceptService).addDecisions(enrolment.observations, decisions.enrolmentDecisions);
        this.programEncounter.programEnrolment = enrolment;

        return decisions;
    }

    getNextScheduledVisits(ruleService, context) {
        return ruleService.getNextScheduledVisits(this.programEncounter, ProgramEncounter.schema.name);
    }

    hasNoFormElements() {
        return _.isEmpty(this.filteredFormElements);
    }
}

export default ProgramEncounterState;