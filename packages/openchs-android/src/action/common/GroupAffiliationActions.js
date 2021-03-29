import _ from 'lodash';
import General from "../../utility/General";
import EntityService from "../../service/EntityService";
import {GroupRole, GroupSubject, Individual, ValidationResult} from 'avni-models';

export default class GroupAffiliationActions {

    static updateValue(state, action, context) {
        const newState = state.clone();
        const {formElement, groupSubjectUUID, groupSubjectRoleUUID} = action;
        const entityService = context.get(EntityService);
        const groupRole = entityService.findByUUID(groupSubjectRoleUUID, GroupRole.schema.name);
        const groupSubject = entityService.findByUUID(groupSubjectUUID, Individual.schema.name);
        if (_.isEmpty(groupRole) || _.isEmpty(groupSubject)) {
            General.logDebug("GroupAffiliationActions", "Group role, group subject or member subject not found skipping");
            return newState;
        }
        const groupSubjectEntity = GroupSubject.createEmptyInstance();
        groupSubjectEntity.groupRole = groupRole;
        groupSubjectEntity.groupSubject = groupSubject;
        groupSubjectEntity.membershipStartDate = new Date();
        groupSubjectEntity.memberSubject = null;
        newState.groupAffiliation.groupSubjectObservations = newState.groupAffiliation.updateGroupSubjectObservations(formElement.concept, groupSubjectEntity);
        newState.handleValidationResults(GroupAffiliationActions._validate(formElement, groupSubjectEntity, newState.validationResults), context);
        return newState;
    }

    static _validate(formElement, groupSubjectEntity, previousErrors) {
        const otherValidationErrors = previousErrors.filter(({formIdentifier, success}) => (formElement.uuid !== formIdentifier && !success));
        if (formElement.mandatory && _.isEmpty(groupSubjectEntity)) {
            otherValidationErrors.push(new ValidationResult(false, formElement.uuid, "emptyValidationMessage"));
        } else {
            otherValidationErrors.push(new ValidationResult(true, formElement.uuid));
        }
        return otherValidationErrors;
    }
}
