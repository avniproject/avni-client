import IndividualService from "../../service/IndividualService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import GeolocationActions from "../common/GeolocationActions";
import EntityService from "../../service/EntityService";
import {Form, Individual, SubjectType, Point} from "openchs-models";
import SubjectRegistrationState from '../../state/SubjectRegistrationState';
import _ from 'lodash';
import RuleEvaluationService from "../../service/RuleEvaluationService";

export class SubjectRegisterActions {
    static getInitialState(context) {
        const form = context.get(EntityService).findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
        const subjectTypes = context.get(EntityService).getAll(SubjectType.schema.name);
        return {form: form, subjectType: subjectTypes[0]};
    }

    static filterFormElements(formElementGroup, context, subject) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subject, Individual.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onLoad(state, action, context) {
        let isNewEntity = _.isNil(action.subjectUUID);
        const subject = isNewEntity ?
            Individual.createEmptyInstance() : context.get(IndividualService).findByUUID(action.subjectUUID);
        if (_.isEmpty(subject.subjectType.name)) {
            subject.subjectType = state.subjectType;
        }

        let firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(state.form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => SubjectRegisterActions.filterFormElements(formElementGroup, context, subject).length !== 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            throw new Error("No form element group with visible form element");
        }

        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subject, Individual.schema.name, firstGroupWithAtLeastOneVisibleElement);
        let filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);

        return SubjectRegistrationState.createOnLoad(subject, state.form, isNewEntity, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses);
    }

    static enterRegistrationDate(state, action) {
        const newState = state.clone();
        newState.subject.registrationDate = action.value;
        return newState;
    }

    static enterName(state, action) {
        const newState = state.clone();
        newState.subject.setFirstName(action.value);
        newState.handleValidationResult(newState.subject.validateFirstName());
        return newState;
    }

    static enterSubjectAddressLevel(state, action) {
        const newState = state.clone();
        newState.subject.lowestAddressLevel = action.value;
        newState.handleValidationResult(newState.subject.validateAddress());
        return newState;
    }

    static setLocation(state, action, context) {
        const newState = state.clone();
        const position = action.value;
        newState.subject.registrationLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        newState.handleValidationResult(
            state.validateLocation(
                newState.subject.registrationLocation,
                Individual.validationKeys.REGISTRATION_LOCATION,
                context
            )
        );
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
        context.get(IndividualService).register(newState.subject);
        action.cb();
        return newState;
    }
}

const actions = {
    ON_LOAD: "5eb95861-b093-4210-9d87-04b07719918e",
    NEXT: "ef514731-1e10-4c5a-8f8c-16eb0d13ceb7",
    PREVIOUS: "170a7491-b168-4297-90ed-b0bbbba40fae",
    REGISTRATION_ENTER_REGISTRATION_DATE: "19057ea4-361e-45be-af07-fbaa7b712a1a",
    REGISTRATION_ENTER_NAME: "REGISTRATION_ENTER_NAME",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "9f199d88-d807-4185-ba6b-e2ae03a698b4",
    TOGGLE_MULTISELECT_ANSWER: "ce9b2d28-4e0f-4b14-9cfa-b3865aea0c33",
    TOGGLE_SINGLESELECT_ANSWER: "6ed009d2-2ddd-40b4-a6ff-7208477d70e2",
    PRIMITIVE_VALUE_CHANGE: '5b47e250-f323-4e4f-af08-d59ae7d7b7f7',
    PRIMITIVE_VALUE_END_EDITING: '80cb17fa-ea6e-40cb-ad25-819ecbe5190c',
    DATE_DURATION_CHANGE: '39424ce5-ea3f-475a-ae65-947b5ab8b77c',
    DURATION_CHANGE: 'c45669d7-a79f-48e5-a786-cc60e873e7dd',
    SAVE: 'f52a8a2b-2d46-4bfc-9bcc-34851d754422',
    RESET: 'b0fc5ebb-03db-4449-abac-e9790f926447',
    SET_LOCATION: "SRA.SET_LOCATION",
    SET_LOCATION_ERROR: "SRA.SET_LOCATION_ERROR",
};

export default new Map([
    [actions.ON_LOAD, SubjectRegisterActions.onLoad],
    [actions.NEXT, SubjectRegisterActions.onNext],
    [actions.PREVIOUS, SubjectRegisterActions.onPrevious],
    [actions.REGISTRATION_ENTER_REGISTRATION_DATE, SubjectRegisterActions.enterRegistrationDate],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, SubjectRegisterActions.enterSubjectAddressLevel],
    [actions.REGISTRATION_ENTER_NAME, SubjectRegisterActions.enterName],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [actions.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [actions.SAVE, SubjectRegisterActions.onSave],
    [actions.SET_LOCATION, SubjectRegisterActions.setLocation],
    [actions.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
]);

export {actions as Actions};
