import Individual from "../models/Individual";
import Gender from "../models/Gender";
import EntityService from "../service/EntityService";
import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import _ from 'lodash';
import Form from '../models/application/Form';

class IndividualRegistrationState extends AbstractDataEntryState {
    static createIntialState(context) {
        const individualRegistrationState = new IndividualRegistrationState();
        individualRegistrationState.individual = Individual.createSafeInstance();
        individualRegistrationState.genders = context.get(EntityService).getAll(Gender.schema.name);
        individualRegistrationState.ageProvidedInYears = true;

        const form = IndividualRegistrationState.getForm(context);
        individualRegistrationState.wizard = new Wizard(_.isNil(form) ? 1 : form.formElementGroups.length + 1, 2);

        return individualRegistrationState;
    }

    static getForm(context) {
        return context.get(EntityService).findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
    }

    newRegistration() {
        this.individual = new Individual();
        this.individual.observations = [];
        this.wizard.reset();
    }

    clone() {
        const newState = new IndividualRegistrationState();
        newState.individual = this.individual.cloneWithoutEncounters();
        newState.genders = this.genders;
        newState.age = this.age;
        newState.ageProvidedInYears = this.ageProvidedInYears;
        newState.wizard = this.wizard.clone();
        super.clone(newState);
        return newState;
    }

    get observationsHolder() {
        return this.individual;
    }
}

export default IndividualRegistrationState;