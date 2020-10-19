import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import ConceptService from "../service/ConceptService";
import {Individual, ObservationsHolder, StaticFormElementGroup} from 'avni-models';
import _ from "lodash";
import HouseholdState from "./HouseholdState";

class SubjectRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, subject, isNewEntity, filteredFormElements, subjectType, workLists) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, workLists);
        this.subject = subject;
        this.subjectType = subjectType;
        this.household = new HouseholdState(workLists);
    }

    getEntity() {
        return this.subject;
    }

    getEntityType() {
        return Individual.schema.name;
    }

    static createOnLoad(subject, form, isNewEntity, formElementGroup, filteredFormElements, formElementStatuses, workLists, minLevelTypeUUIDs) {
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        let state = new SubjectRegistrationState(
            [],
            formElementGroup,
            new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup),
            subject,
            isNewEntity,
            filteredFormElements,
            subject.subjectType,
            workLists
        );
        state.form = form;
        state.minLevelTypeUUIDs = minLevelTypeUUIDs;
        state.observationsHolder.updatePrimitiveObs(filteredFormElements, formElementStatuses);
        return state;
    }

    static createOnLoadForEmptyForm(subject, form, isNewEntity, workLists, minLevelTypeUUIDs) {
        let state = new SubjectRegistrationState(
            [],
            new StaticFormElementGroup(form),
            new Wizard(1),
            subject,
            isNewEntity,
            [],
            subject.subjectType,
            workLists
        );
        state.form = form;
        state.minLevelTypeUUIDs = minLevelTypeUUIDs;
        return state;
    }

    clone() {
        const newState = new SubjectRegistrationState();
        newState.subject = this.subject.cloneForEdit();
        newState.subjectType = this.subjectType;
        newState.form = this.form;
        newState.filteredFormElements = this.filteredFormElements;
        newState.household = this.household.clone();
        newState.isNewEntity = this.isNewEntity;
        newState.minLevelTypeUUIDs = this.minLevelTypeUUIDs;
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
        return this.wizard.isFirstPage() ? [..._.keys(Individual.nonIndividualValidationKeys), ..._.keys(HouseholdState.validationKeys)] : [];
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
        return validationResults;
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.subject, this.formElementGroup.form, "Individual");
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.subject, "Individual");
        context.get(ConceptService).addDecisions(this.subject.observations, decisions.registrationDecisions);

        return decisions;
    }

    getEffectiveDataEntryDate() {
        return this.subject.registrationDate;
    }

    getNextScheduledVisits(ruleService, context) {
        return ruleService.getNextScheduledVisits(this.subject, Individual.schema.name, []);
    }
}

export default SubjectRegistrationState;
