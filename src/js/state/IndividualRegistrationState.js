import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import _ from "lodash";
import StaticFormElementGroup from "../models/application/StaticFormElementGroup";
import Individual from "../models/Individual";
import ObservationsHolder from "../models/ObservationsHolder";
import ConceptService from "../service/ConceptService";

class IndividualRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, genders, age, ageProvidedInYears, individual, isNewEntity) {
        super(validationResults, formElementGroup, wizard, isNewEntity);
        this.genders = genders;
        this.age = age;
        this.ageProvidedInYears = ageProvidedInYears;
        this.individual = individual;
    }

    static createLoadState(form, genders, individual) {
        const wizard = new Wizard(_.isNil(form) ? 1 : form.numberOfPages + 1, 2);
        return new IndividualRegistrationState([], new StaticFormElementGroup(form), wizard, genders, "", true, individual, true);
    }

    clone() {
        const newState = new IndividualRegistrationState();
        newState.individual = this.individual.cloneForEdit();
        newState.genders = this.genders;
        newState.age = this.age;
        newState.ageProvidedInYears = this.ageProvidedInYears;
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.individual.observations);
    }

    movePrevious() {
        this.wizard.movePrevious();
        if (!this.wizard.isNonFormPage()) {
            this.formElementGroup = this.formElementGroup.previous();
        } else {
            this.formElementGroup = new StaticFormElementGroup(this.formElementGroup.form);
        }
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? _.keys(Individual.validationKeys) : [];
    }

    validateEntity() {
        return this.individual.validate();
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.individual);
    }

    executeRule(ruleService, context) {
        const decisions = ruleService.getDecision(this.individual);
        context.get(ConceptService).addDecisions(this.individual.observations, decisions);
        return decisions;
    }
}

export default IndividualRegistrationState;