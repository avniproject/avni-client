import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import ConceptService from "../service/ConceptService";
import {Concept, Individual, ObservationsHolder, StaticFormElementGroup} from 'avni-models';
import _ from "lodash";
import HouseholdState from "./HouseholdState";
import IndividualService from "../service/IndividualService";
import {ValidationResult} from "openchs-models";
import EntityService from "../service/EntityService";
import ObservationHolderActions from "../action/common/ObservationsHolderActions";
import TimerState from "./TimerState";

class SubjectRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, subject, isNewEntity, filteredFormElements, subjectType, workLists, timerState, group) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, workLists, timerState, isNewEntity);
        this.subject = subject;
        this.subjectType = subjectType;
        this.household = new HouseholdState(workLists);
        this.group = group;
    }

    getEntity() {
        return this.subject;
    }

    getEntityType() {
        return Individual.schema.name;
    }

    getEntityContext() {
        return {
            group: this.group
        }
    }

    static createOnLoad(subject, form, isNewEntity, formElementGroup, filteredFormElements, formElementStatuses, workLists, minLevelTypeUUIDs, isSaveDraftOn, groupAffiliationState, context, group) {
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        const timerState = formElementGroup.timed && isNewEntity ? new TimerState(formElementGroup.startTime, formElementGroup.stayTime) : null;
        let state = new SubjectRegistrationState(
            [],
            formElementGroup,
            new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup),
            subject,
            isNewEntity,
            filteredFormElements,
            subject.subjectType,
            workLists,
            timerState,
            group
        );
        state.form = form;
        state.minLevelTypeUUIDs = minLevelTypeUUIDs;
        state.saveDrafts = isNewEntity && isSaveDraftOn;
        state.groupAffiliation = groupAffiliationState;
        state.observationsHolder.updatePrimitiveCodedObs(filteredFormElements, formElementStatuses);
        if (ObservationHolderActions.hasQuestionGroupWithValueInElementStatus(formElementStatuses, formElementGroup.getFormElements())) {
            ObservationHolderActions.updateFormElements(formElementGroup, state, context);
        }
        return state;
    }

    static createOnLoadForEmptyForm(subject, form, isNewEntity, workLists, minLevelTypeUUIDs, isSaveDraftOn, groupAffiliationState, group) {
        let state = new SubjectRegistrationState(
            [],
            new StaticFormElementGroup(form),
            new Wizard(1),
            subject,
            isNewEntity,
            [],
            subject.subjectType,
            workLists,
            group

        );
        state.form = form;
        state.minLevelTypeUUIDs = minLevelTypeUUIDs;
        state.saveDrafts = isNewEntity && isSaveDraftOn;
        state.groupAffiliation = groupAffiliationState;
        return state;
    }

    clone() {
        const newState = new SubjectRegistrationState();
        // newState.subject = this.subject.cloneForEdit();
        newState.subject = this.subject;
        newState.subjectType = this.subjectType;
        newState.form = this.form;
        newState.filteredFormElements = this.filteredFormElements;
        newState.household = this.household.clone();
        newState.isNewEntity = this.isNewEntity;
        newState.minLevelTypeUUIDs = this.minLevelTypeUUIDs;
        newState.saveDrafts = this.saveDrafts;
        newState.groupAffiliation = this.groupAffiliation;
        newState.group = this.group;
        super.clone(newState);
        return newState;
    }

    getWorkContext() {
        const workContext = {
            subjectTypeName: this.subjectType.name,
            subjectUUID: this.subject.uuid,
        };
        return this.subjectType.isHousehold() ? {...workContext, totalMembers: this.household.totalMembers}: workContext;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.subject.observations);
    }

    get staticFormElementIds() {
        const groupAffiliationFormElements = this.filteredFormElements.filter(({concept}) => concept.dataType === Concept.dataType.GroupAffiliation).map(({uuid}) => uuid);
        return this.wizard.isFirstPage() ? [..._.keys(Individual.nonIndividualValidationKeys), ..._.keys(HouseholdState.validationKeys), ...groupAffiliationFormElements] : [...groupAffiliationFormElements];
    }

    validateEntity(context) {
        const validationResults = this.subject.validate();
        const locationValidation = this.validateLocation(
            this.subject.registrationLocation,
            Individual.validationKeys.REGISTRATION_LOCATION,
            context
        );
        validationResults.push(locationValidation);
        if (this.subjectType.isHousehold() && this.isNewEntity) {
            const totalMemberValidation = this.household.validateTotalMembers();
            validationResults.push(totalMemberValidation);
        }
        validationResults.push(this.validateName(context));
        validationResults.push(...this.groupAffiliation.validate(this.filteredFormElements));
        return validationResults;
    }

    validateName(context) {
        const {firstName, subjectType, uuid} = this.subject;
        const nameValidationKey = Individual.nonIndividualValidationKeys.NAME;
        if (subjectType.uniqueName) {
            const savedSubjectsWithSameName = context.get(IndividualService).getSubjectWithTheNameAndType({firstName, subjectType, uuid});
            return savedSubjectsWithSameName.length === 0 ? ValidationResult.successful(nameValidationKey) : ValidationResult.failure(nameValidationKey, 'duplicateValue', {subjectTypeName: subjectType.name});
        }
        return ValidationResult.successful(nameValidationKey);
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.subject, this.formElementGroup.form, "Individual", this.getEntityContext());
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.subject, "Individual", {}, this.getEntityContext());
        context.get(ConceptService).addDecisions(this.subject.observations, decisions.registrationDecisions);

        return decisions;
    }

    getEffectiveDataEntryDate() {
        return this.subject.registrationDate;
    }

    getNextScheduledVisits(ruleService, context) {
        const nextScheduledVisits =  ruleService.getNextScheduledVisits(this.subject, Individual.schema.name, [], this.getEntityContext());
        return context.get(IndividualService).validateAndInjectOtherSubjectForScheduledVisit(this.subject, nextScheduledVisits);
    }

    getEntityResultSetByType(context) {
        return context.get(EntityService).getAllNonVoided(Individual.schema.name).filtered('subjectType.uuid = $0', this.subject.subjectType.uuid);
    }
}

export default SubjectRegistrationState;
