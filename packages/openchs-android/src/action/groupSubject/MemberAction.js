import GroupSubjectService from "../../service/GroupSubjectService";
import _ from "lodash";
import {IndividualRelation, IndividualRelative, ValidationResult} from 'avni-models';
import EntityService from "../../service/EntityService";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";
import IndividualRelationGenderMappingService from "../../service/relationship/IndividualRelationGenderMappingService";

export class MemberAction {

    static getInitialState(context) {
        const relations = context.get(EntityService).getAll(IndividualRelation.schema.name);
        return {
            member: {
                groupSubject: {},
                memberSubject: {},
                groupRole: {},
                membershipStartDate: {value: new Date()},
                membershipEndDate: {}
            },
            groupRoles: [],
            validationResults: [],
            messageDisplayed: true,
            relations,
            individualRelative: IndividualRelative.createEmptyInstance(),
            workListUpdated: false
        }
    }

    static clone(state) {
        const validationResults = [];
        state.validationResults.forEach((validationResult) => {
            validationResults.push(ValidationResult.clone(validationResult));
        });
        const member = MemberAction.cloneMember(state.member);
        return {
            member,
            groupRoles: state.groupRoles,
            relations: state.relations,
            individualRelative: state.individualRelative.cloneForEdit(),
            validationResults: validationResults,
            messageDisplayed: state.messageDisplayed,
            workListUpdated: state.workListUpdated,
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
        const newState = MemberAction.getInitialState(context);
        if (!_.isNil(action.params)) {
            const groupSubject = action.params.groupSubject;
            newState.member = MemberAction.cloneMember(context.get(GroupSubjectService).findByUUID(groupSubject.uuid));
            newState.member.membershipStartDate = {value: groupSubject.membershipStartDate};
            newState.member.membershipEndDate = {value: groupSubject.membershipEndDate};
            MemberAction._getRelative(newState.member.groupSubject, newState.member.memberSubject, newState);
            newState.groupRoles = context.get(GroupSubjectService).getGroupRoles(newState.member.groupSubject.subjectType);
        } else {
            const groupSubject = action.groupSubject;
            newState.groupRoles = context.get(GroupSubjectService).getGroupRoles(groupSubject.subjectType);
            newState.member.groupSubject = groupSubject;
        }
        MemberAction.autoAssignRoleIfRequired(newState, newState.member.groupSubject, newState.groupRoles, context);
        return newState;
    }

    static _getRelative(groupSubject, memberSubject, state) {
        if (groupSubject.isHousehold() && !_.isEmpty(groupSubject.getHeadOfHouseholdGroupSubject())) {
            const headOfHousehold = groupSubject.getHeadOfHouseholdGroupSubject().memberSubject;
            const subjectRelationship = _.intersectionBy(memberSubject.relationships, headOfHousehold.relationships, 'uuid').filter(({voided}) => !voided);
            if (subjectRelationship.length > 0) {
                const relationship = subjectRelationship[0];
                state.individualRelative.individual = memberSubject;
                state.individualRelative.relation = relationship.relationship.individualAIsToBRelation;
                state.individualRelative.relative = headOfHousehold;
            } else {
                state.individualRelative = IndividualRelative.createEmptyInstance();
                state.individualRelative.relative = headOfHousehold;
            }
        }
    }

    static autoAssignRoleIfRequired(state, groupSubject, groupRoles, context) {
        if (groupSubject.isHousehold() && _.isEmpty(state.member.groupRole)) {
            const groupSubjects = groupSubject.groupSubjects.filter(({voided}) => !voided);
            const headOfHouseholdGroupSubject = groupSubject.getHeadOfHouseholdGroupSubject();
            if (groupSubjects.length === 0 || _.isEmpty(headOfHouseholdGroupSubject)) {
                state.member.groupRole = _.find(groupRoles, groupRole => groupRole.isHeadOfHousehold)
            } else {
                state.member.groupRole = _.find(groupRoles, groupRole => groupRole.isHouseholdMember);
                state.individualRelative.relative = headOfHouseholdGroupSubject.memberSubject;
                MemberAction.handleValidationResult(state, state.individualRelative.validateRelative());
            }
        }
    }

    static selectRelation(state, action) {
        const newState = MemberAction.clone(state);
        newState.individualRelative.relation = action.value;
        MemberAction.handleValidationResult(newState, newState.individualRelative.validateRelation());
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
            MemberAction.handleValidationResult(state, validationResult);
        });
    }

    static validateFieldForEmpty(value, key) {
        if (value instanceof Date) {
            return _.isNil(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
        }
        return _.isEmpty(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
    }

    static checkValidationErrors(state, validationResults) {
        const validationErrors = validationResults;
        if (_.isEmpty(state.member.groupRole))
            validationErrors.push(ValidationResult.failure('ROLE', 'emptyValidationMessage'));
        if (_.isNil(state.member.membershipStartDate.value))
            validationErrors.push(ValidationResult.failure('MEMBERSHIP_START_DATE', 'emptyValidationMessage'));
        MemberAction.handleValidationResults(state, validationErrors);
    }

    static onSave(state, action, context) {
        const newState = MemberAction.clone(state);
        const groupRole = state.member.groupRole;
        MemberAction.checkValidationErrors(newState, MemberAction.validateRelative(newState, context));
        if (_.isEmpty(newState.validationResults)) {
            context.get(GroupSubjectService).addMember(newState.member);
            groupRole.isHouseholdMember && context.get(IndividualRelationshipService).addRelative(newState.individualRelative);
            action.cb();
        }
        return newState;
    }

    static validateRelative(state, context) {
        const groupRole = state.member.groupRole;
        if (groupRole.isHouseholdMember) {
            state.relations = context.get(IndividualRelationGenderMappingService).getRelationsForGender(state.individualRelative.relative.gender);
            MemberAction.validateRelation(state, state.relations);
            const existingRelatives = context.get(IndividualRelationshipService).getRelatives(state.individualRelative.individual);
            return state.individualRelative.validate(existingRelatives);
        }
        return [];
    }

    static validateRelation(state, relations) {
        const validRelation = _.find(relations, relation => relation.name === state.individualRelative.relation.name);
        if (_.isEmpty(validRelation)) {
            state.individualRelative.relation = IndividualRelation.createEmptyInstance();
        }
    }

    static addRole(state, action, context) {
        const newState = MemberAction.clone(state);
        newState.member.groupRole = action.value;
        MemberAction.handleValidationResult(newState, MemberAction.validateFieldForEmpty(action.value, 'ROLE'));
        const groupSubjects = newState.member.groupSubject.groupSubjects;
        const currentMemberCount = _.filter(groupSubjects, groupSubject => groupSubject.voided === false && groupSubject.groupRole.uuid === action.value.uuid).length;
        const maximumNumberOfMembers = newState.member.groupRole.maximumNumberOfMembers;
        const validationError = currentMemberCount === maximumNumberOfMembers ? ValidationResult.failure('ROLE', 'maxLimitReachedMsg') : ValidationResult.successful('ROLE');
        MemberAction.handleValidationResult(newState, validationError);
        return newState;
    }

    static addMember(state, action, context) {
        const newState = MemberAction.clone(state);
        newState.member.memberSubject = action.value;
        newState.individualRelative.individual = action.value;
        const groupSubjects = newState.member.groupSubject.groupSubjects;
        const alreadyPresent = _.find(groupSubjects, groupSubject => groupSubject.memberSubject.uuid === newState.member.memberSubject.uuid && groupSubject.voided === false);
        const validationError = !_.isEmpty(alreadyPresent) ? ValidationResult.failure('GROUP_MEMBER', 'memberAlreadyAddedMessage') : ValidationResult.successful('GROUP_MEMBER');
        const validationResults = newState.member.groupRole.isHouseholdMember ? [...MemberAction.validateRelative(newState, context), validationError] : [validationError];
        MemberAction.checkValidationErrors(newState, validationResults);
        return newState;
    }

    static addMembershipStartDate(state, action, context) {
        const newState = MemberAction.clone(state);
        newState.member.membershipStartDate = {value: action.value};
        MemberAction.handleValidationResult(newState, MemberAction.validateFieldForEmpty(action.value, 'MEMBERSHIP_START_DATE'));
        return newState;
    }

    static addMembershipEndDate(state, action) {
        const newState = MemberAction.clone(state);
        newState.member.membershipEndDate = {value: action.value};
        MemberAction.handleValidationResult(newState, MemberAction.validateFieldForEmpty(action.value, 'MEMBERSHIP_END_DATE'));
        return newState;
    }

    static displayMessage(state) {
        const newState = MemberAction.clone(state);
        newState.messageDisplayed = false;
        return newState;
    }

    static onDeleteMember(state, action, context) {
        const newState = MemberAction.clone(state);
        if (_.isNil(state.member.membershipEndDate.value)) {
            newState.validationResults.push(ValidationResult.failure('MEMBERSHIP_END_DATE', 'emptyValidationMessage'));
        }
        if (_.isEmpty(newState.validationResults)) {
            context.get(GroupSubjectService).deleteMember(newState.member);
            action.cb();
        }
        return newState;
    }

    static onWorkListUpdate(state) {
        const newState = MemberAction.clone(state);
        newState.workListUpdated = true;
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
    ON_RELATION_SELECT: `${ActionPrefix}.ON_RELATION_SELECT`,
    WORK_LIST_UPDATED: `${ActionPrefix}.WORK_LIST_UPDATED`,
};

const AddMemberActionMap = new Map([
    [AddNewMemberActions.ON_LOAD, MemberAction.onLoad],
    [AddNewMemberActions.ON_SAVE, MemberAction.onSave],
    [AddNewMemberActions.ON_DELETE_MEMBER, MemberAction.onDeleteMember],
    [AddNewMemberActions.ON_MEMBER_SELECT, MemberAction.addMember],
    [AddNewMemberActions.ON_MEMBERSHIP_START_DATE_SELECT, MemberAction.addMembershipStartDate],
    [AddNewMemberActions.ON_MEMBERSHIP_END_DATE_SELECT, MemberAction.addMembershipEndDate],
    [AddNewMemberActions.ON_ROLE_SELECT, MemberAction.addRole],
    [AddNewMemberActions.DISPLAY_MESSAGE, MemberAction.displayMessage],
    [AddNewMemberActions.ON_RELATION_SELECT, MemberAction.selectRelation],
    [AddNewMemberActions.WORK_LIST_UPDATED, MemberAction.onWorkListUpdate],
]);

export {AddNewMemberActions, AddMemberActionMap}
