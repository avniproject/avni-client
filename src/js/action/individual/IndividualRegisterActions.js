import Individual from "../../models/Individual";
import Gender from "../../models/Gender";
import EntityService from "../../service/EntityService";

export class IndividualRegisterActions {
    static clone(state) {
        const newState = {};
        newState.individual = state.individual.cloneWithoutEncounters();
        newState.genders = state.genders;
        newState.age = state.age;
        newState.ageProvidedInYears = state.ageProvidedInYears;
        return newState;
    }

    static enterIndividualName(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.individual.name = action.value;
        return newState;
    }

    static enterIndividualDOB(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.individual.setDateOfBirth(action.value);
        newState.age = newState.individual.getAge().durationValueAsString;
        newState.ageProvidedInYears = newState.individual.getAge().isInYears;
        return newState;
    }

    static enterIndividualDOBVerified(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.individual.dateOfBirthVerified = action.value;
        return newState;
    }

    static enterIndividualAge(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.age = action.value;
        newState.individual.setAge(action.value, state.ageProvidedInYears);
        return newState;
    }

    static enterIndividualAgeProvidedInYears(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.ageProvidedInYears = action.value;
        newState.individual.setAge(state.age, action.value);
        return newState;
    }

    static enterIndividualGender(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.individual.gender = action.value;
        return newState;
    }

    static enterIndividualAddressLevel(state, action) {
        const newState = IndividualRegisterActions.clone(state);
        newState.individual.lowestAddressLevel = action.value;
        return newState;
    }

    static getInitialState(context) {
        return {individual: new Individual(), genders: context.get(EntityService).getAll(Gender.schema.name), ageProvidedInYears: true};
    }
}

const actions = {
    REGISTRATION_ENTER_NAME: "REGISTRATION_ENTER_NAME",
    REGISTRATION_ENTER_DOB: "REGISTRATION_ENTER_DOB",
    REGISTRATION_ENTER_DOB_VERIFIED: "REGISTRATION_ENTER_DOB_VERIFIED",
    REGISTRATION_ENTER_AGE: "REGISTRATION_ENTER_AGE",
    REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS: "REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS",
    REGISTRATION_ENTER_GENDER: "REGISTRATION_ENTER_GENDER",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "REGISTRATION_ENTER_ADDRESS_LEVEL"
};

export default new Map([
    [actions.REGISTRATION_ENTER_NAME, IndividualRegisterActions.enterIndividualName],
    [actions.REGISTRATION_ENTER_DOB, IndividualRegisterActions.enterIndividualDOB],
    [actions.REGISTRATION_ENTER_DOB_VERIFIED, IndividualRegisterActions.enterIndividualDOBVerified],
    [actions.REGISTRATION_ENTER_AGE, IndividualRegisterActions.enterIndividualAge],
    [actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, IndividualRegisterActions.enterIndividualAgeProvidedInYears],
    [actions.REGISTRATION_ENTER_GENDER, IndividualRegisterActions.enterIndividualGender],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, IndividualRegisterActions.enterIndividualAddressLevel]
]);

export {actions as Actions};