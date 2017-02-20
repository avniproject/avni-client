import IndividualRegistrationState from "../../state/IndividualRegistrationState";
import Form from "../../models/application/Form";
import EntityService from "../../service/EntityService";

export class IndividualRegisterActions {
    static enterIndividualName(state, action) {
        const newState = state.clone(state);
        newState.individual.name = action.value;
        newState.handleValidationResult(newState.individual.validateName());
        return newState;
    }

    static enterIndividualDOB(state, action) {
        const newState = state.clone(state);
        newState.individual.setDateOfBirth(action.value);
        newState.age = newState.individual.getAge().durationValueAsString;
        newState.ageProvidedInYears = newState.individual.getAge().isInYears;

        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualDOBVerified(state, action) {
        const newState = state.clone(state);
        newState.individual.dateOfBirthVerified = action.value;
        return newState;
    }

    static enterIndividualAge(state, action) {
        const newState = state.clone(state);
        newState.age = action.value;
        newState.individual.setAge(action.value, state.ageProvidedInYears);
        const validationResult = newState.individual.validateDateOfBirth();
        newState.handleValidationResult(validationResult);
        return newState;
    }

    static enterIndividualAgeProvidedInYears(state, action) {
        const newState = state.clone(state);
        newState.ageProvidedInYears = action.value;
        newState.individual.setAge(state.age, action.value);
        const validationResult = newState.individual.validateDateOfBirth();
        newState.handleValidationResult(validationResult);
        return newState;
    }

    static enterIndividualGender(state, action) {
        const newState = state.clone(state);
        newState.individual.gender = action.value;
        return newState;
    }

    static enterIndividualAddressLevel(state, action) {
        const newState = state.clone(state);
        newState.individual.lowestAddressLevel = action.value;
        return newState;
    }

    static getInitialState(context) {
        return IndividualRegistrationState.createIntialState(context);
    }

    static onLoad(state, action, context) {
        const newState = state.clone(state);
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
        newState.newRegistration(form);
        return newState;
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        const validationResults = newState.individual.validate();
        newState.handleValidationResults(validationResults);
        if (newState.validationResults.length !== 0) {
            return newState;
        }

        newState.moveNext();
        return newState;
    }
}

const actions = {
    ON_LOAD: "REGISTRATION_ON_LOAD",
    NEXT: "REGISTRATION_NEXT",
    REGISTRATION_ENTER_NAME: "REGISTRATION_ENTER_NAME",
    REGISTRATION_ENTER_DOB: "REGISTRATION_ENTER_DOB",
    REGISTRATION_ENTER_DOB_VERIFIED: "REGISTRATION_ENTER_DOB_VERIFIED",
    REGISTRATION_ENTER_AGE: "REGISTRATION_ENTER_AGE",
    REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS: "REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS",
    REGISTRATION_ENTER_GENDER: "REGISTRATION_ENTER_GENDER",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "REGISTRATION_ENTER_ADDRESS_LEVEL"
};

export default new Map([
    [actions.ON_LOAD, IndividualRegisterActions.onLoad],
    [actions.NEXT, IndividualRegisterActions.onNext],
    [actions.REGISTRATION_ENTER_NAME, IndividualRegisterActions.enterIndividualName],
    [actions.REGISTRATION_ENTER_DOB, IndividualRegisterActions.enterIndividualDOB],
    [actions.REGISTRATION_ENTER_DOB_VERIFIED, IndividualRegisterActions.enterIndividualDOBVerified],
    [actions.REGISTRATION_ENTER_AGE, IndividualRegisterActions.enterIndividualAge],
    [actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, IndividualRegisterActions.enterIndividualAgeProvidedInYears],
    [actions.REGISTRATION_ENTER_GENDER, IndividualRegisterActions.enterIndividualGender],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, IndividualRegisterActions.enterIndividualAddressLevel]
]);

export {actions as Actions};