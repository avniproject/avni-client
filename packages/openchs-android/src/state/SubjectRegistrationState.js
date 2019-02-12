import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import ConceptService from "../service/ConceptService";
import {Individual, ObservationsHolder} from "openchs-models";
import _ from "lodash";
import ValidationResult from "../../../openchs-models/src/application/ValidationResult";
import Geo from "../framework/geo";

class SubjectRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, subject, isNewEntity, filteredFormElements, subjectType) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements);
        this.subject = subject;
        this.subjectType = subjectType;
    }

    getEntity() {
        return this.subject;
    }

    getEntityType() {
        return Individual.schema.name;
    }

    static createOnLoad(subject, form, isNewEntity, formElementGroup, filteredFormElements, formElementStatuses) {
        const formElementGroupPageNumber = formElementGroup.displayOrder;
        let state = new SubjectRegistrationState(
            [],
            formElementGroup,
            new Wizard(form.numberOfPages, formElementGroupPageNumber, formElementGroupPageNumber),
            subject,
            isNewEntity,
            filteredFormElements,
            subject.subjectType
        );
        state.form = form;
        state.observationsHolder.updatePrimitiveObs(filteredFormElements, formElementStatuses);
        return state;
    }

    clone() {
        const newState = new SubjectRegistrationState();
        newState.subject = this.subject.cloneForEdit();
        newState.subjectType = this.subjectType;
        newState.form = this.form;
        newState.filteredFormElements = this.filteredFormElements;
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.subject.observations);
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? _.keys(Individual.nonIndividualValidationKeys) : [];
    }

    validateEntity() {
        const validationResults = this.subject.validate();
        const locationValidation = this.validateLocation(
            this.subject.registrationLocation,
            Individual.validationKeys.REGISTRATION_LOCATION,
        );
        validationResults.push(locationValidation);
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
}

export default SubjectRegistrationState;