import IndividualService from "../../service/IndividualService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import GeolocationActions from "../common/GeolocationActions";
import EntityService from "../../service/EntityService";
import {DraftSubject, Individual, ObservationsHolder, Point, SubjectType} from "avni-models";
import SubjectRegistrationState from '../../state/SubjectRegistrationState';
import _ from 'lodash';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import IdentifierAssignmentService from "../../service/IdentifierAssignmentService";
import FormMappingService from "../../service/FormMappingService";
import GroupSubjectService from "../../service/GroupSubjectService";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import DraftSubjectService from "../../service/draft/DraftSubjectService";
import PhoneNumberVerificationActions from "../common/PhoneNumberVerificationActions";
import GroupAffiliationState from "../../state/GroupAffiliationState";
import GroupAffiliationActions from "../common/GroupAffiliationActions";
import QuickFormEditingActions from "../common/QuickFormEditingActions";
import TimerActions from "../common/TimerActions";

export class SubjectRegisterActions {
    static getInitialState(context) {
        return {};
    }

    static filterFormElements(formElementGroup, context, subject) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subject, Individual.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onLoad(state, action, context) {
        let isNewEntity = action.isDraftEntity || _.isNil(action.subjectUUID);
        const subject = action.isDraftEntity ?
            SubjectRegisterActions.getDraftSubject(action, context) :
            SubjectRegisterActions.getOrCreateSubject(isNewEntity, action, context);
        const subjectType = subject.subjectType;
        const form = context.get(FormMappingService).findRegistrationForm(subjectType);

        let firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => SubjectRegisterActions.filterFormElements(formElementGroup, context, subject).length !== 0);
        const organisationConfigService = context.get(OrganisationConfigService);
        const customRegistrationLocations = organisationConfigService.getCustomRegistrationLocationsForSubjectType(subjectType.uuid);
        const isSaveDraftOn = organisationConfigService.isSaveDraftOn();
        const minLevelTypeUUIDs = !_.isEmpty(customRegistrationLocations) ? customRegistrationLocations.locationTypeUUIDs : [];
        const groupAffiliationState = new GroupAffiliationState();
        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return SubjectRegistrationState.createOnLoadForEmptyForm(subject, form, isNewEntity, action.workLists, minLevelTypeUUIDs, isSaveDraftOn, groupAffiliationState);
        }

        //Populate identifiers much before form elements are hidden or sent to rules.
        //This will enable the value to be used in rules
        let observationsHolder = new ObservationsHolder(subject.observations);
        context.get(IdentifierAssignmentService).populateIdentifiers(form, observationsHolder);
        context.get(GroupSubjectService).populateGroups(subject.uuid, form, groupAffiliationState);
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subject, Individual.schema.name, firstGroupWithAtLeastOneVisibleElement);
        let filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        const newState = SubjectRegistrationState.createOnLoad(subject, form, isNewEntity, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses, action.workLists, minLevelTypeUUIDs, isSaveDraftOn, groupAffiliationState, context);
        const finalState = action.isDraftEntity ? SubjectRegisterActions.setTotalMemberForDraftSubject(newState, context) : newState;
        return QuickFormEditingActions.moveToPage(finalState, action, context, SubjectRegisterActions);
    }

    static enterRegistrationDate(state, action) {
        const newState = state.clone();
        newState.subject.registrationDate = action.value;
        return newState;
    }

    static enterName(state, action, context) {
        const newState = state.clone();
        newState.subject.setFirstName(action.value);
        newState.handleValidationResults([newState.validateName(context), newState.subject.validateFirstName()], context);
        return newState;
    }

    static enterSubjectAddressLevel(state, action) {
        const newState = state.clone();
        newState.subject.lowestAddressLevel = action.value;
        newState.handleValidationResult(newState.subject.validateAddress());
        return newState;
    }

    static setProfilePicture(state, action, context) {
        const newState = state.clone();
        const isSame = action.answerUUID === newState.subject.profilePicture;
        newState.subject.profilePicture = isSame ? null : action.answerUUID;
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
        const newState = state.clone().handleNext(action, context);
        if (state.saveDrafts && _.isEmpty(newState.validationResults)) {
            const draftSubject = DraftSubject.create(state.subject, state.household.totalMembers);
            context.get(DraftSubjectService).saveDraftSubject(draftSubject);
        }
        return newState;
    }

    static onSummaryPage(state, action, context) {
        return state.clone().handleSummaryPage(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(IndividualService).register(newState.subject, action.nextScheduledVisits, action.skipCreatingPendingStatus, newState.groupAffiliation.groupSubjectObservations);
        const {member} = newState.household;
        if (!_.isNil(member)) {
            member.memberSubject = context.get(IndividualService).findByUUID(newState.subject.uuid);
            context.get(GroupSubjectService).addMember(member, false);
        }
        action.cb();
        context.get(DraftSubjectService).deleteDraftSubjectByUUID(newState.subject.uuid);
        return newState;
    }

    static enterTotalMembers(state, action) {
        const newState = state.clone();
        newState.household.setTotalMembers(action.value);
        newState.handleValidationResult(newState.household.validateTotalMembers());
        return newState;
    }

    static getDraftSubject(action, context) {
        const draftSubject = context.get(DraftSubjectService).findByUUID(action.subjectUUID);
        const subject = draftSubject.constructIndividual();
        subject.name = subject.nameString;
        return subject;
    }

    static setTotalMemberForDraftSubject(state, context) {
        const draftSubject = context.get(DraftSubjectService).findByUUID(state.subject.uuid);
        state.household.totalMembers = draftSubject.totalMembers;
        return state;
    }

    static getOrCreateSubject(isNewEntity, action, context) {
        let subject;
        if (isNewEntity) {
            subject = Individual.createEmptySubjectInstance();
        } else {
            const subjectFromDB = context.get(IndividualService).findByUUID(action.subjectUUID);
            subject = subjectFromDB.cloneForEdit();
        }
        const currentWorkItem = action.workLists.getCurrentWorkItem();
        const subjectType = context.get(EntityService).findByKey('name', currentWorkItem.parameters.subjectTypeName, SubjectType.schema.name);

        if (_.isEmpty(subject.subjectType.name)) {
            subject.subjectType = subjectType;
        }
        return subject;
    }
}

const actions = {
    ON_LOAD: "5eb95861-b093-4210-9d87-04b07719918e",
    NEXT: "ef514731-1e10-4c5a-8f8c-16eb0d13ceb7",
    SUMMARY_PAGE: "7b3c26ec-ac66-40ea-9188-7b51ec3a85d5",
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
    SET_PROFILE_PICTURE: "SRA.SET_PROFILE_PICTURE",
    SET_LOCATION: "SRA.SET_LOCATION",
    SET_LOCATION_ERROR: "SRA.SET_LOCATION_ERROR",
    REGISTRATION_ENTER_TOTAL_MEMBERS: "REGISTRATION_ENTER_TOTAL_MEMBERS",
    PHONE_NUMBER_CHANGE: "SRA.PHONE_NUMBER_CHANGE",
    GROUP_QUESTION_VALUE_CHANGE: "SRA.GROUP_QUESTION_VALUE_CHANGE",
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: "SRA.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE",
    ON_SUCCESS_OTP_VERIFICATION: "SRA.ON_SUCCESS_OTP_VERIFICATION",
    ON_SKIP_VERIFICATION: "SRA.ON_SKIP_VERIFICATION",
    TOGGLE_GROUPS: "SRA.TOGGLE_GROUPS",
    ON_TIMED_FORM: "SRA.ON_TIMED_FORM",
    ON_START_TIMER: "SRA.ON_START_TIMER",
};

export default new Map([
    [actions.ON_LOAD, SubjectRegisterActions.onLoad],
    [actions.NEXT, SubjectRegisterActions.onNext],
    [actions.SUMMARY_PAGE, SubjectRegisterActions.onSummaryPage],
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
    [actions.SET_PROFILE_PICTURE, SubjectRegisterActions.setProfilePicture],
    [actions.SET_LOCATION, SubjectRegisterActions.setLocation],
    [actions.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
    [actions.REGISTRATION_ENTER_TOTAL_MEMBERS, SubjectRegisterActions.enterTotalMembers],
    [actions.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [actions.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [actions.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
    [actions.ON_SUCCESS_OTP_VERIFICATION, PhoneNumberVerificationActions.onSuccessVerification],
    [actions.ON_SKIP_VERIFICATION, PhoneNumberVerificationActions.onSkipVerification],
    [actions.TOGGLE_GROUPS, GroupAffiliationActions.updateValue],
    [actions.ON_TIMED_FORM, TimerActions.onTimedForm],
    [actions.ON_START_TIMER, TimerActions.onStartTimer],
]);

export {actions as Actions};
