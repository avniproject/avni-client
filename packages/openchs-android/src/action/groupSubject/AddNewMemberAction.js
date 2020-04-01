import GroupSubjectService from "../../service/GroupSubjectService";
import _ from "lodash";
import {ValidationResult} from 'avni-models';

export class AddNewMemberAction {

    static getInitialState(context) {
        return {
            member: {
                groupSubject: {},
                memberSubject: {},
                groupRole: {},
                membershipStartDate: {},
                membershipEndDate: {}
            },
            groupRoles: [],
            validationResults: [],
            messageDisplayed: true
        }
    }

    static clone(state) {
        const validationResults = [];
        state.validationResults.forEach((validationResult) => {
            validationResults.push(ValidationResult.clone(validationResult));
        });
        const member = AddNewMemberAction.cloneMember(state.member);
        return {
            member,
            groupRoles: state.groupRoles,
            validationResults: validationResults,
            messageDisplayed: state.messageDisplayed,
        };
    }

    static cloneMember(member) {
        return {
            uuid: member.uuid,
            groupSubject: member.groupSubject,
            memberSubject: member.memberSubject,
            groupRole: member.groupRole,
            membershipStartDate: member.membershipStartDate,
            membershipEndDate: member.membershipEndDate,
        }
    }

    static onLoad(state, action, context) {
        const newState = AddNewMemberAction.getInitialState(context);
        if (!_.isNil(action.params)) {
            const groupSubject = action.params.groupSubject;
            newState.member = AddNewMemberAction.cloneMember(context.get(GroupSubjectService).findByUUID(groupSubject.uuid));
            newState.member.membershipStartDate = {value: groupSubject.membershipStartDate};
            newState.member.membershipEndDate = {value: groupSubject.membershipEndDate};
            newState.groupRoles = context.get(GroupSubjectService).getGroupRoles(newState.member.groupSubject.subjectType);
        } else {
            const groupSubject = action.groupSubject;
            newState.groupRoles = context.get(GroupSubjectService).getGroupRoles(groupSubject.subjectType);
            newState.member.groupSubject = groupSubject;
        }
        return newState;
    }

    static handleValidationResult(state, validationResult) {
        _.remove(state.validationResults, (existingValidationResult) => existingValidationResult.formIdentifier === validationResult.formIdentifier);
        if (!validationResult.success) {
            state.validationResults.push(validationResult);
        }
    }

    static handleValidationResults(state, validationResults) {
        validationResults.forEach((validationResult) => {
            AddNewMemberAction.handleValidationResult(state, validationResult);
        });
    }

    static validateFieldForEmpty(value, key) {
        if (value instanceof Date) {
            return _.isNil(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
        }
        return _.isEmpty(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
    }

    static checkValidationErrors(state) {
        const validationErrors = [];
        if (_.isEmpty(state.member.groupRole))
            validationErrors.push(ValidationResult.failure('ROLE', 'emptyValidationMessage'));
        if (_.isNil(state.member.membershipStartDate.value))
            validationErrors.push(ValidationResult.failure('MEMBERSHIP_START_DATE', 'emptyValidationMessage'));
        AddNewMemberAction.handleValidationResults(state, validationErrors);
    }

    static onSave(state, action, context) {
        const newState = AddNewMemberAction.clone(state);
        AddNewMemberAction.checkValidationErrors(newState);
        if (_.isEmpty(newState.validationResults)) {
            context.get(GroupSubjectService).addMember(newState.member);
            action.cb();
        }
        return newState;
    }

    static addRole(state, action, context) {
        const newState = AddNewMemberAction.clone(state);
        newState.member.groupRole = action.value;
        AddNewMemberAction.handleValidationResult(newState, AddNewMemberAction.validateFieldForEmpty(action.value, 'ROLE'));
        const groupSubjects = newState.member.groupSubject.groupSubjects;
        const currentMemberCount = _.filter(groupSubjects, groupSubject => groupSubject.voided === false && groupSubject.groupRole.uuid === action.value.uuid).length;
        const maximumNumberOfMembers = newState.member.groupRole.maximumNumberOfMembers;
        const validationError = currentMemberCount === maximumNumberOfMembers ? ValidationResult.failure('ROLE', 'maxLimitReachedMsg') : ValidationResult.successful('ROLE');
        AddNewMemberAction.handleValidationResult(newState, validationError);
        return newState;
    }

    static addMember(state, action, context) {
        const newState = AddNewMemberAction.clone(state);
        newState.member.memberSubject = action.value;
        const groupSubjects = newState.member.groupSubject.groupSubjects;
        const alreadyPresent = _.find(groupSubjects, groupSubject => groupSubject.memberSubject.uuid === newState.member.memberSubject.uuid && groupSubject.voided === false);
        const validationError = !_.isEmpty(alreadyPresent) ? ValidationResult.failure('GROUP_MEMBER', 'memberAlreadyAddedMessage') : ValidationResult.successful('GROUP_MEMBER');
        AddNewMemberAction.handleValidationResult(newState, validationError);
        return newState;
    }

    static addMembershipStartDate(state, action, context) {
        const newState = AddNewMemberAction.clone(state);
        newState.member.membershipStartDate = {value: action.value};
        AddNewMemberAction.handleValidationResult(newState, AddNewMemberAction.validateFieldForEmpty(action.value, 'MEMBERSHIP_START_DATE'));
        return newState;
    }

    static addMembershipEndDate(state, action) {
        const newState = AddNewMemberAction.clone(state);
        newState.member.membershipEndDate = {value: action.value};
        AddNewMemberAction.handleValidationResult(newState, AddNewMemberAction.validateFieldForEmpty(action.value, 'MEMBERSHIP_END_DATE'));
        return newState;
    }

    static displayMessage(state) {
        const newState = AddNewMemberAction.clone(state);
        newState.messageDisplayed = false;
        return newState;
    }

    static onDeleteMember(state, action, context) {
        const newState = AddNewMemberAction.clone(state);
        if (_.isNil(state.member.membershipEndDate.value)) {
            newState.validationResults.push(ValidationResult.failure('MEMBERSHIP_END_DATE', 'emptyValidationMessage'));
        }
        if (_.isEmpty(newState.validationResults)) {
            context.get(GroupSubjectService).deleteMember(newState.member);
            action.cb();
        }
        return newState;
    }

}

const ActionPrefix = 'AddNewMember';
const AddNewMemberActions = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_ROLE_SELECT: `${ActionPrefix}.ON_ROLE_SELECT`,
    ON_MEMBER_SELECT: `${ActionPrefix}.ON_MEMBER_SELECT`,
    ON_MEMBERSHIP_START_DATE_SELECT: `${ActionPrefix}.ON_MEMBERSHIP_START_DATE_SELECT`,
    ON_MEMBERSHIP_END_DATE_SELECT: `${ActionPrefix}.ON_MEMBERSHIP_END_DATE_SELECT`,
    ON_SAVE: `${ActionPrefix}.ON_SAVE`,
    ON_DELETE_MEMBER: `${ActionPrefix}.ON_DELETE_MEMBER`,
    DISPLAY_MESSAGE: `${ActionPrefix}.DISPLAY_MESSAGE`,
};

const AddMemberActionMap = new Map([
    [AddNewMemberActions.ON_LOAD, AddNewMemberAction.onLoad],
    [AddNewMemberActions.ON_SAVE, AddNewMemberAction.onSave],
    [AddNewMemberActions.ON_DELETE_MEMBER, AddNewMemberAction.onDeleteMember],
    [AddNewMemberActions.ON_MEMBER_SELECT, AddNewMemberAction.addMember],
    [AddNewMemberActions.ON_MEMBERSHIP_START_DATE_SELECT, AddNewMemberAction.addMembershipStartDate],
    [AddNewMemberActions.ON_MEMBERSHIP_END_DATE_SELECT, AddNewMemberAction.addMembershipEndDate],
    [AddNewMemberActions.ON_ROLE_SELECT, AddNewMemberAction.addRole],
    [AddNewMemberActions.DISPLAY_MESSAGE, AddNewMemberAction.displayMessage]
]);

export {AddNewMemberActions, AddMemberActionMap}
