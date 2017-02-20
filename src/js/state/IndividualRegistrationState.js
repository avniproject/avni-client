import Individual from "../models/Individual";
import Gender from "../models/Gender";
import EntityService from "../service/EntityService";
import AbstractDataEntryState from "./AbstractDataEntryState";

class IndividualRegistrationState extends AbstractDataEntryState {
    static createIntialState(context) {
        const individualRegistrationState = new IndividualRegistrationState();
        individualRegistrationState.individual = new Individual();
        individualRegistrationState.genders = context.get(EntityService).getAll(Gender.schema.name);
        individualRegistrationState.ageProvidedInYears = true;
        return individualRegistrationState;
    }

    newRegistration(form) {
        this.individual = new Individual();
        this.formElementGroup = form.formElementGroups.length !== 0 ? form.formElementGroups[0] : null;
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
}

export default IndividualRegistrationState;