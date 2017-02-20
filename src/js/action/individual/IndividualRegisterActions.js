import IndividualRegistrationState from "../../state/IndividualRegistrationState";
import IndividualService from "../../service/IndividualService";
import ObservationsHolderActions from '../common/ObservationsHolderActions';

export class IndividualRegisterActions {
    static getInitialState(context) {
        return IndividualRegistrationState.createIntialState(context);
    }

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
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualAgeProvidedInYears(state, action) {
        const newState = state.clone(state);
        newState.ageProvidedInYears = action.value;
        newState.individual.setAge(state.age, action.value);
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualGender(state, action) {
        const newState = state.clone(state);
        newState.individual.gender = action.value;
        newState.handleValidationResult(newState.individual.validateGender());
        return newState;
    }

    static enterIndividualAddressLevel(state, action) {
        const newState = state.clone(state);
        newState.individual.lowestAddressLevel = action.value;
        newState.handleValidationResult(newState.individual.validateAddress());
        return newState;
    }

    static onLoad(state, action, context) {
        const newState = state.clone(state);
        newState.newRegistration();
        newState.wizard.reset();
        return newState;
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        const validationResults = newState.individual.validate();
        newState.handleValidationResults(validationResults);
        if (newState.validationResults.length !== 0 && newState.wizard.isLastPage()) {
            action.validationFailed();
        } else if (newState.wizard.isLastPage()) {
            context.get(IndividualService).register(newState.individual);
            action.saved();
        } else if (newState.validationResults.length === 0) {
            newState.moveNext(() => IndividualRegistrationState.getForm(context));
            action.movedNext();
        }
        return newState;
    }

    static onPrevious(state, action, context) {
        const newState = state.clone();
        newState.movePrevious();
        action.cb(newState.wizard.isNonFormPage());
        return newState;
    }
}

const actions = {
    ON_LOAD: "REGISTRATION_ON_LOAD",
    NEXT: "REGISTRATION_NEXT",
    PREVIOUS: "REGISTRATION_PREVIOUS",
    REGISTRATION_ENTER_NAME: "REGISTRATION_ENTER_NAME",
    REGISTRATION_ENTER_DOB: "REGISTRATION_ENTER_DOB",
    REGISTRATION_ENTER_DOB_VERIFIED: "REGISTRATION_ENTER_DOB_VERIFIED",
    REGISTRATION_ENTER_AGE: "REGISTRATION_ENTER_AGE",
    REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS: "REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS",
    REGISTRATION_ENTER_GENDER: "REGISTRATION_ENTER_GENDER",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "REGISTRATION_ENTER_ADDRESS_LEVEL",
    TOGGLE_MULTISELECT_ANSWER: "b2af8248-ad5e-4639-ba6d-02b25c813e5e",
    TOGGLE_SINGLESELECT_ANSWER: "cdc7b1c2-d5aa-4382-aa93-1663275132f7",
    PRIMITIVE_VALUE_CHANGE: '13230ada-ee22-4a50-a2a8-5f14d1d9cd46',
};

export default new Map([
    [actions.ON_LOAD, IndividualRegisterActions.onLoad],
    [actions.NEXT, IndividualRegisterActions.onNext],
    [actions.PREVIOUS, IndividualRegisterActions.onPrevious],
    [actions.REGISTRATION_ENTER_NAME, IndividualRegisterActions.enterIndividualName],
    [actions.REGISTRATION_ENTER_DOB, IndividualRegisterActions.enterIndividualDOB],
    [actions.REGISTRATION_ENTER_DOB_VERIFIED, IndividualRegisterActions.enterIndividualDOBVerified],
    [actions.REGISTRATION_ENTER_AGE, IndividualRegisterActions.enterIndividualAge],
    [actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, IndividualRegisterActions.enterIndividualAgeProvidedInYears],
    [actions.REGISTRATION_ENTER_GENDER, IndividualRegisterActions.enterIndividualGender],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, IndividualRegisterActions.enterIndividualAddressLevel],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObs],
]);

export {actions as Actions};