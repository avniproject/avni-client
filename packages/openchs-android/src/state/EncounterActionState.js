import _ from "lodash";
import AbstractDataEntryState from "./AbstractDataEntryState";
import {AbstractEncounter, Encounter, ObservationsHolder, StaticFormElementGroup} from 'avni-models';
import Wizard from "./Wizard";
import ConceptService from "../service/ConceptService";
import IndividualService from "../service/IndividualService";
import EntityService from "../service/EntityService";
import ObservationHolderActions from "../action/common/ObservationsHolderActions";
import TimerState from "./TimerState";
import DraftEncounterService from "../service/draft/DraftEncounterService";

class EncounterActionState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, isNewEntity, encounter, filteredFormElements, workLists, messageDisplayed, timerState, isFirstFlow, isDraft) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, workLists, timerState, isFirstFlow, isDraft);
        this.encounter = encounter;
        this.previousEncountersDisplayed = false;
        this.messageDisplayed = messageDisplayed;
        this.loadPullDownView = false;
        this.allElementsFilledForImmutableEncounter = false;
        this.saveDrafts = isFirstFlow && isDraft;
    }

    getEntity() {
        return this.encounter;
    }

    getEntityType() {
        return Encounter.schema.name;
    }

    clone() {
        const newState = new EncounterActionState();
        // newState.encounter = _.isNil(this.encounter) ? this.encounter : this.encounter.cloneForEdit();
        newState.encounter = this.encounter;
        newState.previousEncountersDisplayed = this.previousEncountersDisplayed;
        newState.loadPullDownView = this.loadPullDownView;
        newState.messageDisplayed = this.messageDisplayed;
        newState.allElementsFilledForImmutableEncounter = this.allElementsFilledForImmutableEncounter;
        if(newState.previousEncountersDisplayed){
            newState.previousEncounters = this.previousEncounters;
        }
        newState.saveDrafts = this.saveDrafts;
        super.clone(newState);
        return newState;
    }

    getWorkContext() {
        return {
            subjectUUID: this.encounter.individual.uuid,
        };
    }

    get observationsHolder() {
        return new ObservationsHolder(this.encounter.observations);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.fieldKeys.ENCOUNTER_DATE_TIME] : [];
    }

    static createOnLoadState(encounter, form, isNewEntity, formElementGroup, filteredFormElements, formElementStatuses, workLists, messageDisplayed, context, action) {
        const draftEncounter = context.get(DraftEncounterService).findByUUID(action.encounter.uuid);
        const isDraft = !!draftEncounter;
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        const isFirstFlow = isNewEntity || !action.editing;

        const timerState = formElementGroup.timed && isFirstFlow && !isDraft ? new TimerState(formElementGroup.startTime, formElementGroup.stayTime) : null;
        let state = new EncounterActionState([], formElementGroup, new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup), isNewEntity, encounter, filteredFormElements, workLists, messageDisplayed, timerState, isFirstFlow, isDraft);
        state.observationsHolder.updatePrimitiveCodedObs(filteredFormElements, formElementStatuses);
        if (ObservationHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, formElementGroup.getFormElements())) {
            ObservationHolderActions.updateFormElements(formElementGroup, state, context);
        }
        return state;
    }

    static createOnLoadStateForEmptyForm(encounter, form, isNewEntity, workLists, messageDisplayed) {
        let state = new EncounterActionState([], new StaticFormElementGroup(form), new Wizard(1), isNewEntity, encounter, [], workLists, messageDisplayed);
        return state;
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.encounter, this.formElementGroup.form, 'Encounter');
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.encounter, 'Encounter');
        context.get(ConceptService).addDecisions(this.encounter.observations, decisions.encounterDecisions);

        const individual = this.encounter.individual.cloneForEdit();
        if (!_.isEmpty(decisions.registrationDecisions)) {
            context.get(ConceptService).addDecisions(individual.observations, decisions.registrationDecisions);
        }
        this.encounter.individual = individual;

        return decisions;
    }

    validateEntity(context) {
        const validationResults = this.encounter.validate();
        const locationValidation = this.validateLocation(
            this.encounter.encounterLocation,
            Encounter.validationKeys.ENCOUNTER_LOCATION,
            context
        );
        validationResults.push(locationValidation);
        return validationResults;
    }

    getEffectiveDataEntryDate() {
        return this.encounter.encounterDateTime;
    }

    getNextScheduledVisits(ruleService, context) {
        const nextScheduledVisits = ruleService.getNextScheduledVisits(this.encounter, Encounter.schema.name, [])
          .filter((x) => !this.isAlreadyScheduled(this.encounter.individual, x));
        return context.get(IndividualService).validateAndInjectOtherSubjectForScheduledVisit(this.encounter.individual, nextScheduledVisits);
    }

    getEntityResultSetByType(context) {
        const {individual, encounterType} = this.encounter;
        return context.get(EntityService).getAllNonVoided(Encounter.schema.name)
            .filtered('individual.subjectType.uuid = $0 and encounterType.uuid = $1', individual.subjectType.uuid, encounterType.uuid);
    }
}

export default EncounterActionState;
