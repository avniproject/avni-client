import FamilyService from "../../service/FamilyService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import EntityService from "../../service/EntityService";
import {Family, Gender} from "openchs-models";
import FamilyRegistrationState from "../../state/FamilyRegistrationState";
import _ from 'lodash';

export class FamilyRegisterActions {
    static getInitialState(context) {
        // const form = context.get(EntityService).findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
        const genders = context.get(EntityService).getAll(Gender.schema.name);
        return {genders: genders};
    }

    static onLoad(state, action, context) {
        const family = _.isNil(action.familyUUID) ?
            Family.createEmptyInstance() : context.get(FamilyService).findByUUID(action.familyUUID);
        return FamilyRegistrationState.createLoadState(state.form, state.genders, family);
    }

    static enterRegistrationDate(state, action) {
        const newState = state.clone();
        newState.family.registrationDate = action.value;
        newState.handleValidationResult(newState.family.validateRegistrationDate());
        return newState;
    }

    static enterHeadOfFamily(state, action) {
        const newState = state.clone();
        newState.family.setHeadOfFamily(action.value);
        newState.handleValidationResult(newState.family.validateHeadOfFamily());
        return newState;
    }


    static enterFamilyAddressLevel(state, action) {
        const newState = state.clone();
        newState.family.lowestAddressLevel = action.value;
        newState.handleValidationResult(newState.family.validateAddress());
        return newState;
    }

    static enterFamilyTypeOfFamily(state, action) {
        const newState = state.clone();
        newState.family.typeOfFamily = action.value;
        newState.handleValidationResult(newState.family.validateTypeOfFamily());
        return newState;
    }

    static enterFamilyHouseholdNumber(state, action) {
        const newState = state.clone();
        newState.family.householdNumber = action.value;
        newState.handleValidationResult(newState.family.validateHouseNumber());
        return newState;
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(FamilyService).register(newState.family);
        action.cb();
        return newState;
    }
}

const actions = {
    ON_LOAD: "FAMILY_REGISTRATION_ON_LOAD",
    NEXT: "FAMILY_REGISTRATION_NEXT",
    PREVIOUS: "FAMILY_REGISTRATION_PREVIOUS",
    REGISTRATION_ENTER_REGISTRATION_DATE: "FAMILY_REGISTRATION_ENTER_REGISTRATION_DATE",
    REGISTRATION_ENTER_HEAD_OF_FAMILY: "FAMILY_REGISTRATION_ENTER_HEAD_OF_FAMILY",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "FAMILY_REGISTRATION_ENTER_ADDRESS_LEVEL",
    REGISTRATION_ENTER_TYPE_OF_FAMILY: "FAMILY_REGISTRATION_ENTER_TYPE_OF_FAMILY",
    REGISTRATION_ENTER_HOUSEHOLD_NUMBER: "FAMILY_REGISTRATION_ENTER_HOUSEHOLD_NUMBER",
    TOGGLE_MULTISELECT_ANSWER: "FAMILY_REGISTRATION_TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "FAMILY_REGISTRATION_TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'FAMILY_REGISTRATION_PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'FAMILY_REGISTRATION_PRIMITIVE_VALUE_END_EDITING',
    DURATION_CHANGE: 'FAMILY_REGISTRATION_DURATION_CHANGE',
    SAVE: 'FRA.SAVE',
    RESET: 'FRA.RESET'
};

export default new Map([
    [actions.ON_LOAD, FamilyRegisterActions.onLoad],
    [actions.NEXT, FamilyRegisterActions.onNext],
    [actions.PREVIOUS, FamilyRegisterActions.onPrevious],
    [actions.REGISTRATION_ENTER_REGISTRATION_DATE, FamilyRegisterActions.enterRegistrationDate],
    [actions.REGISTRATION_ENTER_HEAD_OF_FAMILY, FamilyRegisterActions.enterHeadOfFamily],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, FamilyRegisterActions.enterFamilyAddressLevel],
    [actions.REGISTRATION_ENTER_TYPE_OF_FAMILY, FamilyRegisterActions.enterFamilyTypeOfFamily],
    [actions.REGISTRATION_ENTER_TYPE_OF_FAMILY, FamilyRegisterActions.enterFamilyTypeOfFamily],
    [actions.REGISTRATION_ENTER_HOUSEHOLD_NUMBER, FamilyRegisterActions.enterFamilyHouseholdNumber],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [actions.SAVE, FamilyRegisterActions.onSave],
]);

export {actions as Actions};