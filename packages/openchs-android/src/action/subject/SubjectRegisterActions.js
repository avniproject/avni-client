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
import TaskService from "../../service/task/TaskService";
import General from '../../utility/General';
import AddressLevelService from '../../service/AddressLevelService';

export class SubjectRegisterActions {
    static getInitialState(context) {
        return new SubjectRegistrationState();
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

        let group;
        if(!_.isUndefined(action.groupSubjectUUID)) {
            group = context.get(IndividualService).findByUUID(action.groupSubjectUUID);
        }

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return SubjectRegistrationState.createOnLoadForEmptyForm(subject, form, isNewEntity, action.workLists, minLevelTypeUUIDs, isSaveDraftOn, groupAffiliationState, group);
        }

        //Populate identifiers much before form elements are hidden or sent to rules.
        //This will enable the value to be used in rules
        let observationsHolder = new ObservationsHolder(subject.observations);
        context.get(IdentifierAssignmentService).populateIdentifiers(form, observationsHolder);
        context.get(GroupSubjectService).populateGroups(subject.uuid, form, groupAffiliationState);
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(subject, Individual.schema.name, firstGroupWithAtLeastOneVisibleElement);
        let filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);

        if (!_.isNil(action.taskUuid)) {
            const observations = context.get(TaskService).getObservationsForSubject(action.taskUuid, form);
            subject.observations.push(...observations);
        }

        const newState = SubjectRegistrationState.createOnLoad(subject, form, isNewEntity, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses, action.workLists, minLevelTypeUUIDs, isSaveDraftOn, groupAffiliationState, context, group);
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

    static enterSubjectAddressLevel(state, action, context) {
        const newState = state.clone();
        newState.subject.lowestAddressLevel = action.value && context.get(AddressLevelService).findByUUID(action.value.uuid);
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
        try {
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
        } catch (error) {
            General.logError('SubjectRegisterActions.onSave', error);
            return state.clone();
        }
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

    static onUseThisState(state, action, context) {
        return action.state;
    }
}

const actions = {
    ON_LOAD: "SubjectRegisterActions.ON_LOAD",
    NEXT: "SubjectRegisterActions.NEXT",
    SUMMARY_PAGE: "SubjectRegisterActions.SUMMARY_PAGE",
    PREVIOUS: "SubjectRegisterActions.PREVIOUS",
    USE_THIS_STATE: "SubjectRegisterActions.REGISTRATION_USE_THIS_STATE",
    REGISTRATION_ENTER_REGISTRATION_DATE: "SubjectRegisterActions.REGISTRATION_ENTER_REGISTRATION_DATE",
    REGISTRATION_ENTER_NAME: "REGISTRATION_ENTER_NAME",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "SubjectRegisterActions.REGISTRATION_ENTER_ADDRESS_LEVEL",
    TOGGLE_MULTISELECT_ANSWER: "SubjectRegisterActions.TOGGLE_MULTISELECT_ANSWER",
    TOGGLE_SINGLESELECT_ANSWER: "SubjectRegisterActions.TOGGLE_SINGLESELECT_ANSWER",
    PRIMITIVE_VALUE_CHANGE: 'SubjectRegisterActions.PRIMITIVE_VALUE_CHANGE',
    PRIMITIVE_VALUE_END_EDITING: 'SubjectRegisterActions.PRIMITIVE_VALUE_END_EDITING',
    DATE_DURATION_CHANGE: 'SubjectRegisterActions.DATE_DURATION_CHANGE',
    DURATION_CHANGE: 'SubjectRegisterActions.DURATION_CHANGE',
    SAVE: 'SubjectRegisterActions.SAVE',
    RESET: 'SubjectRegisterActions.RESET',
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
    [actions.USE_THIS_STATE, SubjectRegisterActions.onUseThisState],
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
