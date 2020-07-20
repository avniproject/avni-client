import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {Form, ObservationsHolder, ProgramEncounter} from "avni-models";
import _ from 'lodash';
import ConceptService from "../../service/ConceptService";

class ProgramEncounterCancelState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, programEncounter, filteredFormElements, workLists) {
        super([], formElementGroup, wizard, false, filteredFormElements, workLists);
        this.programEncounter = programEncounter;
    }

    getEntity() {
        return this.programEncounter;
    }

    getEntityType() {
        return _.isNil(this.programEncounter.programEnrolment) ?
            Form.formTypes.IndividualEncounterCancellation :
            Form.formTypes.ProgramEncounterCancellation;
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [ProgramEncounter.validationKeys.CANCEL_LOCATION] : [];
    }

    static createOnLoad(programEncounter, form, formElementGroup, filteredFormElements, workLists) {
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        const wizard = new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup);
        return new ProgramEncounterCancelState(formElementGroup, wizard, programEncounter, filteredFormElements, workLists);
    }

    clone() {
        const newState = super.clone();
        newState.programEncounter = this.programEncounter.cloneForEdit();
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.cancelObservations);
    }

    validateEntity(context) {
        const validationResults = [];
        const locationValidation = this.validateLocation(
            this.programEncounter.cancelLocation,
            ProgramEncounter.validationKeys.CANCEL_LOCATION,
            context
        );
        validationResults.push(locationValidation);
        return validationResults;
    }

    getEffectiveDataEntryDate() {
        return this.programEncounter.cancelDateTime;
    }

    getNextScheduledVisits(ruleService, context) {
        return ruleService.getNextScheduledVisits(this.getEntity(), this.getEntityType());
    }

    getWorkContext() {
        return _.isNil(this.programEncounter.programEnrolment) ? {subjectUUID: this.programEncounter.individual.uuid} : {
            subjectUUID: this.programEncounter.individual.uuid,
            programEnrolmentUUID: this.programEncounter.uuid,
        };
    }

    executeRule(ruleService, context) {
        return _.isNil(this.programEncounter.programEnrolment) ? this.getEncounterDecisions(ruleService, context) :
            this.getProgramEncounterDecisions(ruleService, context);
    }

    getProgramEncounterDecisions(ruleService, context) {
        const decisions = this.getEncounterDecisions(ruleService, context);
        const enrolment = this.programEncounter.programEnrolment.cloneForEdit();
        context.get(ConceptService).addDecisions(enrolment.observations, decisions.enrolmentDecisions);
        this.programEncounter.programEnrolment = enrolment;
        return decisions;
    }

    getEncounterDecisions(ruleService, context) {
        const decisions = ruleService.getDecisions(this.programEncounter, this.getEntityType());
        context.get(ConceptService).addDecisions(this.programEncounter.cancelObservations, decisions.encounterDecisions);
        return decisions;
    }
}

export default ProgramEncounterCancelState;
