import _ from 'lodash';
import General from "../../utility/General";
import EntityService from "../../service/EntityService";
import {GroupRole, GroupSubject, Individual, ValidationResult} from 'avni-models';
import ObservationsHolderActions from "./ObservationsHolderActions";

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
        const existingGroupSubjectObs = _.find(newState.groupAffiliation.groupSubjectObservations,
            (obs) => !_.isNil(_.get(obs, "groupSubject.groupSubject.uuid")) && obs.concept.uuid === formElement.concept.uuid && groupSubject.uuid === obs.groupSubject.groupSubject.uuid);
        const groupSubjectEntity = _.isEmpty(existingGroupSubjectObs) ? GroupAffiliationActions.createEmptyGroupSubject(groupRole, groupSubject) : existingGroupSubjectObs.groupSubject;
        newState.groupAffiliation.groupSubjectObservations = newState.groupAffiliation.updateGroupSubjectObservations(formElement.concept, groupSubjectEntity);
        GroupAffiliationActions.injectGroupsToIndividual(newState.groupAffiliation, newState);
        const formElementStatuses = ObservationsHolderActions._getFormElementStatuses(newState, context);
        const hiddenFormElementStatus = _.filter(formElementStatuses, (form) => form.visibility === false);
        newState.observationsHolder.updatePrimitiveCodedObs(newState.filteredFormElements, formElementStatuses);
        newState.removeHiddenFormValidationResults(hiddenFormElementStatus);
        newState.handleValidationResults(GroupAffiliationActions._validate(formElement, groupSubjectEntity, newState.validationResults), context);
        return newState;
    }

    static createEmptyGroupSubject(groupRole, groupSubject) {
        const groupSubjectEntity = GroupSubject.createEmptyInstance();
        groupSubjectEntity.groupRole = groupRole;
        groupSubjectEntity.groupSubject = groupSubject;
        groupSubjectEntity.membershipStartDate = new Date();
        groupSubjectEntity.memberSubject = null;
        groupSubjectEntity.voided = false;
        return groupSubjectEntity;
    }

    static injectGroupsToIndividual({groupSubjectObservations}, newState) {
        const individual = newState.getEntity().individual;
        const groupSubjectsFromObservations = _.map(groupSubjectObservations, ({groupSubject}) => groupSubject);
        individual.addAffiliatedGroups(groupSubjectsFromObservations);
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
