import IndividualService from "../../service/IndividualService";
import SettingsService from "../../service/SettingsService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import EntityService from "../../service/EntityService";
import Gender from "../../models/Gender";
import IndividualRegistrationState from "../../state/IndividualRegistrationState";
import Form from '../../models/application/Form';
import _ from 'lodash';
import Individual from '../../models/Individual';
import RuleEvaluationService from "../../service/RuleEvaluationService";

export class IndividualRegisterActions {
    static getInitialState(context) {
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
        const genders = context.get(EntityService).getAll(Gender.schema.name);
        return {form: form, genders: genders};
    }

    static onLoad(state, action, context) {
        const individual = _.isNil(action.individualUUID) ?
            Individual.createEmptyInstance(context.get(SettingsService).getSettings().catchment) : context.get(IndividualService).findByUUID(action.individualUUID);
        return IndividualRegistrationState.createLoadState(state.form, state.genders, individual);
    }

    static enterRegistrationDate(state, action, context) {
        const newState = state.clone();
        newState.individual.registrationDate = action.value;
        newState.handleValidationResult(newState.individual.validateRegistrationDate());
        return newState;
    }

    static enterIndividualName(state, action) {
        const newState = state.clone();
        newState.individual.name = action.value;
        newState.handleValidationResult(newState.individual.validateName());
        return newState;
    }

    static enterIndividualDOB(state, action) {
        const newState = state.clone();
        newState.individual.setDateOfBirth(action.value);
        newState.age = newState.individual.getAge().durationValueAsString;
        newState.ageProvidedInYears = newState.individual.getAge().isInYears;

        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualDOBVerified(state, action) {
        const newState = state.clone();
        newState.individual.dateOfBirthVerified = action.value;
        return newState;
    }

    static enterIndividualAge(state, action) {
        const newState = state.clone();
        newState.age = action.value;
        newState.individual.setAge(action.value, state.ageProvidedInYears);
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualAgeProvidedInYears(state, action) {
        const newState = state.clone();
        newState.ageProvidedInYears = action.value;
        newState.individual.setAge(state.age, action.value);
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualGender(state, action) {
        const newState = state.clone();
        newState.individual.gender = action.value;
        newState.handleValidationResult(newState.individual.validateGender());
        return newState;
    }

    static enterIndividualAddressLevel(state, action) {
        const newState = state.clone();
        newState.individual.lowestAddressLevel = action.value;
        newState.handleValidationResult(newState.individual.validateAddress());
        return newState;
    }

    static onNext(state, action, context) {
        const newState = state.clone();
        newState.handleNext(action, context);
        return newState;
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(IndividualService).register(newState.individual);
        action.cb();
        return newState;
    }
}

const actions = {
    ON_LOAD: "REGISTRATION_ON_LOAD",
    NEXT: "REGISTRATION_NEXT",
    PREVIOUS: "REGISTRATION_PREVIOUS",
    REGISTRATION_ENTER_REGISTRATION_DATE: "REGISTRATION_ENTER_REGISTRATION_DATE",
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
    SAVE: 'IRA.SAVE'
};

export default new Map([
    [actions.ON_LOAD, IndividualRegisterActions.onLoad],
    [actions.NEXT, IndividualRegisterActions.onNext],
    [actions.PREVIOUS, ObservationsHolderActions.onPrevious],
    [actions.REGISTRATION_ENTER_REGISTRATION_DATE, IndividualRegisterActions.enterRegistrationDate],
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
    [actions.SAVE, IndividualRegisterActions.onSave],
]);

export {actions as Actions};