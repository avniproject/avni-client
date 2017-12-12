import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import _ from "lodash";
import ConceptService from "../service/ConceptService";
import {StaticFormElementGroup, Individual, ObservationsHolder} from "openchs-models";

class IndividualRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, genders, age, ageProvidedInYears, individual, isNewEntity) {
        super(validationResults, formElementGroup, wizard, isNewEntity);
        this.genders = genders;
        this.age = age;
        this.ageProvidedInYears = ageProvidedInYears;
        this.individual = individual;
    }

    getEntity() {
        return this.individual;
    }

    static createLoadState(form, genders, individual) {
        const wizard = new Wizard(_.isNil(form) ? 1 : form.numberOfPages + 1, 2);
        const individualRegistrationState = new IndividualRegistrationState([], new StaticFormElementGroup(form), wizard, genders, "", true, individual, true);
        individualRegistrationState.form = form;
        return individualRegistrationState;
    }

    clone() {
        const newState = new IndividualRegistrationState();
        newState.individual = this.individual.cloneForEdit();
        newState.genders = this.genders;
        newState.age = this.age;
        newState.ageProvidedInYears = this.ageProvidedInYears;
        newState.form = this.form;
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.individual.observations);
    }

    movePrevious() {
        this.wizard.movePrevious();
        if (this.wizard.isNonFormPage()) {
            this.formElementGroup = new StaticFormElementGroup(this.formElementGroup.form);
        } else {
            this.formElementGroup = this.formElementGroup.previous();
        }
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? _.keys(Individual.validationKeys) : [];
    }

    validateEntity() {
        return this.individual.validate();
    }

    validateEntityAgainstRule(ruleService) {
        let validateAgainstRule = ruleService.validateAgainstRule(this.individual, this.formElementGroup.form, 'Individual');
        
        return validateAgainstRule;
    }

    executeRule(ruleService, context) {
        let decisions = ruleService.getDecisions(this.individual, 'Individual');
        context.get(ConceptService).addDecisions(this.individual.observations, decisions.registrationDecisions);

        return decisions;
    }
}

export default IndividualRegistrationState;