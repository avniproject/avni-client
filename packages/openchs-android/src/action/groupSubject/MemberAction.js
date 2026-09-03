import GroupSubjectService from "../../service/GroupSubjectService";
import _ from 'lodash';
import {ActionEligibilityResponse} from "rules-config";
import {IndividualRelation, IndividualRelative, SubjectType, ValidationResult} from 'avni-models';
import EntityService from "../../service/EntityService";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";
import IndividualRelationGenderMappingService from "../../service/relationship/IndividualRelationGenderMappingService";
import General from '../../utility/General';
import {IndividualRegistrationDetailsActions} from "../individual/IndividualRegistrationDetailsActions";

export class MemberAction {

    // A device limit, not org policy: each candidate costs an eval of the org's rule on the JS
    // thread, and the whole batch runs in one dispatch.
    static MAX_BULK_SELECTION = 100;

    static getInitialState(context) {
        const relations = context.get(EntityService).loadAllNonVoided(IndividualRelation.schema.name);
        return {
            member: {
                groupSubject: {},
                memberSubject: {},
                groupRole: {},
                membershipStartDate: {value: new Date()},
                membershipEndDate: {},
                removalReasonConceptUUID: null
            },
            groupRoles: [],
            validationResults: [],
            messageDisplayed: true,
            relations,
            individualRelative: IndividualRelative.createEmptyInstance(),
            workListUpdated: false,
            bulkAddEnabled: false,
            selectedMembers: [],
            existingMemberCountByRoleUUID: {},
            excludedMemberUUIDs: [],
            eligibilityCache: {}
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
            relativeGender: state.relativeGender,
            bulkAddEnabled: state.bulkAddEnabled,
            selectedMembers: state.selectedMembers.map(({memberSubject, validationResults}) => ({
                memberSubject,
                validationResults: validationResults.map(ValidationResult.clone)
            })),
            // Settled in onLoad, or a pure memo — safe to share across clones.
            existingMemberCountByRoleUUID: state.existingMemberCountByRoleUUID,
            excludedMemberUUIDs: state.excludedMemberUUIDs,
            eligibilityCache: state.eligibilityCache,
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
            removalReasonConceptUUID: member.removalReasonConceptUUID,
        }
    }

    static onLoad(state, action, context) {
        const newState = MemberAction.getInitialState(context);
        if (!_.isNil(action.params)) {
            const groupSubject = action.params.groupSubject;
            newState.member = MemberAction.cloneMember(context.get(GroupSubjectService).findByUUID(groupSubject.uuid));
            newState.member.membershipStartDate = {value: groupSubject.membershipStartDate};
            newState.member.membershipEndDate = {value: groupSubject.membershipEndDate};
            newState.member.removalReasonConceptUUID = groupSubject.removalReasonConceptUUID;
            MemberAction._getRelative(newState.member.groupSubject, newState.member.memberSubject, newState, context);
            newState.groupRoles = context.get(GroupSubjectService).getGroupRoles(newState.member.groupSubject.subjectType);
        } else {
            const groupSubject = action.groupSubject;
            newState.groupRoles = context.get(GroupSubjectService).getGroupRoles(groupSubject.subjectType);
            newState.member.groupSubject = groupSubject;
            // A household member needs their own relation to the head, and a worklist wizard
            // carries exactly one member through to registration. Neither has a batch form.
            newState.bulkAddEnabled = !groupSubject.isHousehold() && _.isNil(action.workLists);
            const currentMembers = _.filter(groupSubject.groupSubjects, ({voided}) => !voided);
            // Snapshot: groupSubjects is a memoised lazy list, so it will not grow during a batch
            // and re-filtering it on every selection change re-hydrates the whole membership.
            newState.excludedMemberUUIDs = _.map(currentMembers, gs => gs.memberSubject.uuid);
            newState.existingMemberCountByRoleUUID = _.countBy(currentMembers, gs => gs.groupRole.uuid);
        }
        MemberAction.autoAssignRoleIfRequired(newState, newState.member.groupSubject, newState.groupRoles, context);
        return newState;
    }

    static _getRelative(groupSubject, memberSubject, state, context) {
        if (!groupSubject.isHousehold() || _.isEmpty(groupSubject.getHeadOfHouseholdGroupSubject())) {
            return;
        }
        const headOfHousehold = groupSubject.getHeadOfHouseholdGroupSubject().memberSubject;
        const relatives = context.get(IndividualRelationshipService).getRelatives(headOfHousehold);
        const subjectRelative = relatives.filter(({relative}) => relative.uuid === memberSubject.uuid);
        if (subjectRelative.length > 0) {
            const relationship = subjectRelative[0];
            state.individualRelative.individual = headOfHousehold;
            state.individualRelative.relation = relationship.relation;
            state.individualRelative.relative = memberSubject;
        } else {
            state.individualRelative = IndividualRelative.createEmptyInstance();
            state.individualRelative.individual = headOfHousehold;
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
                state.individualRelative.individual = headOfHouseholdGroupSubject.memberSubject;
            }
        }
    }

    static selectRelation(state, action, context) {
        const newState = MemberAction.clone(state);
        newState.individualRelative.relation = action.value;
        newState.relativeGender = _.map(context.get(IndividualRelationGenderMappingService).getGenderForRelation(action.value), ({gender}) => gender);
        if (!_.isEmpty(newState.member.memberSubject.uuid)) {
            newState.individualRelative.relative = newState.member.memberSubject;
        }
        MemberAction.handleValidationResults(newState, MemberAction.validateRelative(newState, context));
        return newState;
    }

    static handleValidationResult(state, validationResult) {
        _.remove(state.validationResults, (existingValidationResult) => existingValidationResult.formIdentifier === validationResult.formIdentifier);
        if (!validationResult.success) {
            state.validationResults.push(validationResult);
        }
    }

    static handleValidationResults(state, validationResults) {
        state.validationResults = validationResults.filter(validationResult => !validationResult.success);
    }
    
    static checkMemberEligibility(member, group, context) {
        try {
            return IndividualRegistrationDetailsActions.checkMemberAdditionEligibility(
                member, group, context
            );
        } catch (error) {
            return ActionEligibilityResponse.createAllowedResponse();
        }
    }

    // The rule is eval'd on every call and its failures are recorded per member, so a batch that
    // re-checks the same person is paying twice for the same answer.
    static cachedMemberEligibility(memberSubject, groupSubject, context, cache) {
        if (!_.has(cache, memberSubject.uuid)) {
            cache[memberSubject.uuid] = MemberAction.checkMemberEligibility(memberSubject, groupSubject, context);
        }
        return cache[memberSubject.uuid];
    }

    // Row-scoped checks for one candidate in a batch. acceptedSoFar is what the earlier rows in
    // this same selection have already spent of the role's headroom.
    static validateCandidate(state, memberSubject, acceptedSoFar, context) {
        const results = [];
        const {groupSubject, groupRole} = state.member;

        if (memberSubject.voided) {
            results.push(ValidationResult.failure('GROUP_MEMBER', 'voidedIndividualAlertMessage'));
        }
        if (_.includes(state.excludedMemberUUIDs, memberSubject.uuid)) {
            results.push(ValidationResult.failure('GROUP_MEMBER', 'memberAlreadyAddedMessage'));
        }
        if (!_.isNil(groupRole.memberSubjectType) && !_.isNil(memberSubject.subjectType)
            && groupRole.memberSubjectType.uuid !== memberSubject.subjectType.uuid) {
            // A mismatch is not merely unsaved-invalid: groupToMember.sql joins on it, so the
            // membership would exist and be absent from every report.
            results.push(ValidationResult.failure('GROUP_MEMBER', 'memberSubjectTypeMismatchMessage'));
        }

        const eligibility = MemberAction.cachedMemberEligibility(memberSubject, groupSubject, context, state.eligibilityCache);
        if (eligibility.isDisallowed()) {
            results.push(ValidationResult.failure('GROUP_MEMBER', eligibility.getMessage()));
        }

        const maximumNumberOfMembers = groupRole.maximumNumberOfMembers;
        if (_.isFinite(maximumNumberOfMembers)) {
            const existing = _.get(state.existingMemberCountByRoleUUID, groupRole.uuid, 0);
            if (existing + acceptedSoFar >= maximumNumberOfMembers) {
                results.push(ValidationResult.failure('GROUP_MEMBER', 'maxLimitReachedMsg'));
            }
        }
        return results;
    }

    static revalidateSelection(state, memberSubjects, context) {
        let acceptedSoFar = 0;
        state.selectedMembers = memberSubjects.map(memberSubject => {
            const validationResults = MemberAction.validateCandidate(state, memberSubject, acceptedSoFar, context);
            if (_.isEmpty(validationResults)) acceptedSoFar += 1;
            return {memberSubject, validationResults};
        });
        state.member.memberSubject = _.get(state.selectedMembers, '[0].memberSubject', {});
        return state;
    }

    static addMembers(state, action, context) {
        const newState = MemberAction.clone(state);
        const selected = _.uniqBy(action.value || [], 'uuid');
        return MemberAction.revalidateSelection(newState, _.take(selected, MemberAction.MAX_BULK_SELECTION), context);
    }

    static removeSelectedMember(state, action, context) {
        const newState = MemberAction.clone(state);
        const remaining = _.reject(newState.selectedMembers,
            ({memberSubject}) => memberSubject.uuid === action.memberSubjectUUID);
        return MemberAction.revalidateSelection(newState, _.map(remaining, 'memberSubject'), context);
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
        try {
            const newState = MemberAction.clone(state);
            const groupRole = state.member.groupRole;
            if (!_.isEmpty(newState.selectedMembers)) {
                // Role and start date are shared by the batch and can be cleared after the members
                // are picked; writing past that would give every row an empty membershipStartDate.
                if (!_.isEmpty(newState.validationResults)) return newState;
                const members = MemberAction.saveableMembers(newState);
                if (!_.isEmpty(members)) {
                    context.get(GroupSubjectService).addMembers(members, false);
                    action.cb(members.length);
                }
                return newState;
            }
            MemberAction.checkValidationErrors(newState, MemberAction.validateRelative(newState, context));
            if (_.isEmpty(newState.validationResults)) {
                context.get(GroupSubjectService).addMember(newState.member, groupRole.isHouseholdMember, newState.individualRelative);
                action.cb();
            }
            return newState;
        } catch (error) {
            General.logError('MemberAction.onSave', error);
            return MemberAction.clone(state);
        }
    }

    // No uuid on these: each one gets a fresh one in GroupSubject.create, so a batch cannot
    // collapse into repeated upserts of a single row.
    static saveableMembers(state) {
        return _.filter(state.selectedMembers, ({validationResults}) => _.isEmpty(validationResults))
            .map(({memberSubject}) => ({
                groupSubject: state.member.groupSubject,
                memberSubject,
                groupRole: state.member.groupRole,
                membershipStartDate: state.member.membershipStartDate,
                membershipEndDate: state.member.membershipEndDate,
            }));
    }

    static validateRelative(state, context) {
        const {member, individualRelative} = state;
        if (!member.groupRole.isHouseholdMember || !individualRelative.relativeAndRelationSelected()) {
            return []
        }
        const validRelations = context.get(IndividualRelationGenderMappingService).getRelationsForGender(state.individualRelative.relative.gender);
        const existingRelatives = context.get(IndividualRelationshipService).getRelatives(state.individualRelative.individual);
        return state.individualRelative.validateSelectedRelation(validRelations, existingRelatives);
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
        const allValidationResults = [];
        const newState = MemberAction.clone(state);
        newState.member.memberSubject = action.value;
        newState.individualRelative.relative = action.value;
        
        const groupSubjects = newState.member.groupSubject.groupSubjects;
        
        // Check if member is already present in the group
        const alreadyPresent = _.find(groupSubjects, groupSubject => 
            groupSubject.memberSubject.uuid === newState.member.memberSubject.uuid && 
            groupSubject.voided === false);
        
        const validationError = !_.isEmpty(alreadyPresent) ? 
            ValidationResult.failure('GROUP_MEMBER', 'memberAlreadyAddedMessage') : 
            ValidationResult.successful('GROUP_MEMBER');

        // Add the member validation error for already present member
        if (validationError && !validationError.success) {
            allValidationResults.push(validationError);
        }

        // Check member addition eligibility
        const eligibilityResult = MemberAction.checkMemberEligibility(newState.member.memberSubject, newState.member.groupSubject, context);
        if (eligibilityResult.isDisallowed()) {
            allValidationResults.push(ValidationResult.failure('GROUP_MEMBER', eligibilityResult.getMessage()));
        }
        
        // Get validation results from relation validation if applicable
        const relationValidationResults = newState.member.groupRole.isHouseholdMember ? 
            MemberAction.validateRelative(newState, context) : [];
        allValidationResults.push(...relationValidationResults);

        
        // Add role validation error
        const roleValidationError = MemberAction.validateFieldForEmpty(newState.member.groupRole, 'ROLE');
        if (!roleValidationError.success) {
            allValidationResults.push(roleValidationError);
        }
        
        // Check role member count limit
        if (newState.member.groupRole) {
            const groupSubjects = newState.member.groupSubject.groupSubjects;
            const currentMemberCount = _.filter(groupSubjects, groupSubject => 
                groupSubject.voided === false && 
                groupSubject.groupRole.uuid === newState.member.groupRole.uuid
            ).length;
            const maximumNumberOfMembers = newState.member.groupRole.maximumNumberOfMembers;
            if (currentMemberCount === maximumNumberOfMembers) {
                allValidationResults.push(ValidationResult.failure('ROLE', 'maxLimitReachedMsg'));
            }
        }
        
        // Set all validation errors in state
        MemberAction.handleValidationResults(newState, allValidationResults);
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
        MemberAction.handleValidationResult(newState,
            _.isNil(state.member.membershipEndDate.value)
                ? ValidationResult.failure('MEMBERSHIP_END_DATE', 'emptyValidationMessage')
                : ValidationResult.successful('MEMBERSHIP_END_DATE'));

        const groupSubjectType = newState.member.groupSubject.subjectType;
        const removalReasonParentUUID = groupSubjectType
            && _.isFunction(groupSubjectType.getSetting)
            && groupSubjectType.getSetting(SubjectType.settingKeys.removalReasonConceptUuid);
        MemberAction.handleValidationResult(newState,
            removalReasonParentUUID && _.isNil(newState.member.removalReasonConceptUUID)
                ? ValidationResult.failure('REMOVAL_REASON', 'emptyValidationMessage')
                : ValidationResult.successful('REMOVAL_REASON'));

        if (_.isEmpty(newState.validationResults)) {
            context.get(GroupSubjectService).deleteMember(newState.member);
            action.cb();
        }
        return newState;
    }

    static onRemovalReasonSelect(state, action) {
        const newState = MemberAction.clone(state);
        newState.member.removalReasonConceptUUID = action.value;
        _.remove(newState.validationResults, vr => vr.formIdentifier === 'REMOVAL_REASON');
        return newState;
    }
}

const ActionPrefix = 'AddNewMember';
const AddNewMemberActions = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_ROLE_SELECT: `${ActionPrefix}.ON_ROLE_SELECT`,
    ON_MEMBER_SELECT: `${ActionPrefix}.ON_MEMBER_SELECT`,
    ON_MEMBERS_SELECT: `${ActionPrefix}.ON_MEMBERS_SELECT`,
    ON_MEMBER_REMOVE: `${ActionPrefix}.ON_MEMBER_REMOVE`,
    ON_MEMBERSHIP_START_DATE_SELECT: `${ActionPrefix}.ON_MEMBERSHIP_START_DATE_SELECT`,
    ON_MEMBERSHIP_END_DATE_SELECT: `${ActionPrefix}.ON_MEMBERSHIP_END_DATE_SELECT`,
    ON_SAVE: `${ActionPrefix}.ON_SAVE`,
    ON_DELETE_MEMBER: `${ActionPrefix}.ON_DELETE_MEMBER`,
    ON_REMOVAL_REASON_SELECT: `${ActionPrefix}.ON_REMOVAL_REASON_SELECT`,
    DISPLAY_MESSAGE: `${ActionPrefix}.DISPLAY_MESSAGE`,
    ON_RELATION_SELECT: `${ActionPrefix}.ON_RELATION_SELECT`,
};

const AddMemberActionMap = new Map([
    [AddNewMemberActions.ON_LOAD, MemberAction.onLoad],
    [AddNewMemberActions.ON_SAVE, MemberAction.onSave],
    [AddNewMemberActions.ON_DELETE_MEMBER, MemberAction.onDeleteMember],
    [AddNewMemberActions.ON_REMOVAL_REASON_SELECT, MemberAction.onRemovalReasonSelect],
    [AddNewMemberActions.ON_MEMBER_SELECT, MemberAction.addMember],
    [AddNewMemberActions.ON_MEMBERS_SELECT, MemberAction.addMembers],
    [AddNewMemberActions.ON_MEMBER_REMOVE, MemberAction.removeSelectedMember],
    [AddNewMemberActions.ON_MEMBERSHIP_START_DATE_SELECT, MemberAction.addMembershipStartDate],
    [AddNewMemberActions.ON_MEMBERSHIP_END_DATE_SELECT, MemberAction.addMembershipEndDate],
    [AddNewMemberActions.ON_ROLE_SELECT, MemberAction.addRole],
    [AddNewMemberActions.DISPLAY_MESSAGE, MemberAction.displayMessage],
    [AddNewMemberActions.ON_RELATION_SELECT, MemberAction.selectRelation],
]);

export {AddNewMemberActions, AddMemberActionMap}
