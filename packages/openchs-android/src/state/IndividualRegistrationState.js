import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import _ from "lodash";
import ConceptService from "../service/ConceptService";
import {StaticFormElementGroup, Individual, ObservationsHolder, WorkLists, WorkList, WorkItem, Concept} from "avni-models";
import General from "../utility/General";
import HouseholdState from "./HouseholdState";
import IndividualService from "../service/IndividualService";
import {ValidationResult} from "openchs-models";
import EntityService from "../service/EntityService";
import TimerState from "./TimerState";

class IndividualRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, genders, age, ageProvidedInYears, individual, isNewEntity, filteredFormElements, individualSubjectType, workLists, timerState) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, workLists, timerState, isNewEntity);
        this.genders = genders;
        this.age = age;
        this.ageProvidedInYears = ageProvidedInYears;
        this.individual = individual;
        this.individualSubjectType = individualSubjectType;
        this.household = new HouseholdState(workLists);
    }

    getEntity() {
        return this.individual;
    }

    getEntityType() {
        return Individual.schema.name;
    }

    static createLoadState(form, genders, individual, workLists, minLevelTypeUUIDs, saveDrafts, groupAffiliationState, isNewEntity) {
        const wizard = new Wizard(_.isNil(form) ? 1 : form.numberOfPages + 1, 2);
        const individualRegistrationState = new IndividualRegistrationState([], new StaticFormElementGroup(form), wizard, genders, "", true, individual, isNewEntity, [], individual.subjectType, workLists || new WorkLists(new WorkList(new WorkItem(General.randomUUID(), WorkItem.type.REGISTRATION))), null);
        individualRegistrationState.form = form;
        individualRegistrationState.minLevelTypeUUIDs = minLevelTypeUUIDs;
        individualRegistrationState.saveDrafts = saveDrafts;
        individualRegistrationState.groupAffiliation = groupAffiliationState;
        return individualRegistrationState;
    }

    clone() {
        const newState = new IndividualRegistrationState();
        newState.individual = this.individual.cloneForEdit();
        newState.genders = this.genders;
        newState.age = this.age;
        newState.ageProvidedInYears = this.ageProvidedInYears;
        newState.form = this.form;
        newState.filteredFormElements = this.filteredFormElements;
        newState.individualSubjectType = this.individualSubjectType.clone();
        newState.household = this.household.clone();
        newState.minLevelTypeUUIDs = this.minLevelTypeUUIDs;
        newState.saveDrafts = this.saveDrafts;
        newState.groupAffiliation = this.groupAffiliation;
        super.clone(newState);
        return newState;
    }

    getWorkContext() {
        return {
            subjectTypeName: "Individual",
            subjectUUID: this.individual.uuid,
        };
    }

    get observationsHolder() {
        const observationsHolder = new ObservationsHolder(this.individual.observations);
        observationsHolder.migrateMultiSelectMediaObservations(this.formElementGroup.form);
        return observationsHolder;
    }

    movePrevious() {
        this.wizard.movePrevious();
        this.formElementGroup = this.wizard.isNonFormPage() ?
            new StaticFormElementGroup(this.formElementGroup.form) :
            this.formElementGroup.previous();
    }

    get staticFormElementIds() {
        const groupAffiliationFormElements = this.filteredFormElements.filter(({concept}) => concept.dataType === Concept.dataType.GroupAffiliation).map(({uuid}) => uuid);
        return this.wizard.isFirstPage() ? [..._.keys(Individual.validationKeys), ..._.keys(HouseholdState.validationKeys)] : [...groupAffiliationFormElements];
    }

    validateEntity(context) {
        const validationResults = this.individual.validate();
        const locationValidation = this.validateLocation(
            this.individual.registrationLocation,
            Individual.validationKeys.REGISTRATION_LOCATION,
            context
        );
        if(!_.isEmpty(this.household.relativeGender)){
            validationResults.push(this.household.validateRelativeGender(this.individual.gender));
            validationResults.push(this.household.validateRelativeAge(this.individual));
        }
        validationResults.push(locationValidation);
        validationResults.push(this.validateName(context));
        validationResults.push(...this.groupAffiliation.validate(this.filteredFormElements));
        return validationResults;
    }

    validateName(context) {
        const {firstName, middleName, lastName, subjectType, uuid} = this.individual;
        const nameValidationKey = Individual.validationKeys.NAME;
        if (subjectType.uniqueName) {
            const savedSubjectsWithSameName = context.get(IndividualService).getSubjectWithTheNameAndType({firstName, middleName, lastName, subjectType, uuid});
            return _.isEmpty(savedSubjectsWithSameName) ? ValidationResult.successful(nameValidationKey) : ValidationResult.failure(nameValidationKey, 'duplicateValue', {subjectTypeName: subjectType.name});
        }
        return ValidationResult.successful(nameValidationKey);
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.individual, this.formElementGroup.form, 'Individual');
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.individual, 'Individual');
        context.get(ConceptService).addDecisions(this.individual.observations, decisions.registrationDecisions);

        return decisions;
    }

    getEffectiveDataEntryDate() {
        return this.individual.registrationDate;
    }

    getNextScheduledVisits(ruleService, context) {
        const nextScheduledVisits = ruleService.getNextScheduledVisits(this.individual, Individual.schema.name, []);
        return context.get(IndividualService).validateAndInjectOtherSubjectForScheduledVisit(this.individual, nextScheduledVisits);
    }

    getEntityResultSetByType(context) {
        return context.get(EntityService).getAllNonVoided(Individual.schema.name).filtered('subjectType.uuid = $0', this.individual.subjectType.uuid);
    }
}

export default IndividualRegistrationState;
