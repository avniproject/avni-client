import EntityService from "../service/EntityService";
import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import _ from "lodash";
import Form from "../models/application/Form";
import StaticFormElementGroup from "../models/application/StaticFormElementGroup";

class IndividualRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard) {
        super(validationResults, formElementGroup, wizard);
    }

    static createIntialState(context) {
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
        return new IndividualRegistrationState([], new StaticFormElementGroup(form), new Wizard(_.isNil(form) ? 1 : form.numberOfPages + 1, 2));
    }

    clone() {
        const newState = new IndividualRegistrationState();
        newState.individual = this.individual.cloneWithoutEncounters();
        newState.genders = this.genders;
        newState.age = this.age;
        newState.ageProvidedInYears = this.ageProvidedInYears;
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return this.individual;
    }
}

export default IndividualRegistrationState;