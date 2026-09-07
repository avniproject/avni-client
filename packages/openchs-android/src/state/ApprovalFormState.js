import AbstractDataEntryState from "./AbstractDataEntryState";
import _ from "lodash";
import {EntityApprovalStatus, Individual, ObservationsHolder, StaticFormElementGroup} from 'avni-models';
import Wizard from "./Wizard";

/**
 * The state behind an Approval or Rejection form (avniproject/avni-client#2091).
 *
 * Modelled on TaskState, the existing precedent for a non-encounter entity rendered through
 * AbstractDataEntryState and FormElementGroup - no new form-rendering machinery is needed for either.
 *
 * The answers belong to the decision rather than to the record being approved. A record can be rejected,
 * corrected and rejected again, and each decision keeps its own answers, so observationsHolder wraps the
 * EntityApprovalStatus. The decision held here is unsaved: opening the form must not write anything, and
 * backing out must leave the record's approval status exactly as it was. Persisting the answers is
 * avniproject/avni-client#2092.
 */
class ApprovalFormState extends AbstractDataEntryState {
    constructor(entityApprovalStatus, validationResults, formElementGroup, wizard, filteredFormElements) {
        super(validationResults, formElementGroup, wizard, false, filteredFormElements);
        this.entityApprovalStatus = entityApprovalStatus;
        this.displayProgressIndicator = false;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.entityApprovalStatus.observations);
    }

    get staticFormElementIds() {
        return [];
    }

    static createOnLoadState(entityApprovalStatus, form, formElementGroup, filteredFormElements, formElementStatuses) {
        const indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        const state = new ApprovalFormState(entityApprovalStatus, [], formElementGroup,
            new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup), filteredFormElements);
        state.observationsHolder.updatePrimitiveCodedObs(filteredFormElements, formElementStatuses);
        return state;
    }

    static createOnLoadStateForEmptyForm(entityApprovalStatus, form) {
        return new ApprovalFormState(entityApprovalStatus, [], new StaticFormElementGroup(form), new Wizard(1), []);
    }

    static createEmptyState() {
        return new ApprovalFormState();
    }

    getEntity() {
        return this.entityApprovalStatus;
    }

    getEntityType() {
        return EntityApprovalStatus.schema.name;
    }

    /**
     * The subject the decision is about, for rules to bind to.
     *
     * An EntityApprovalStatus holds only the UUID and type of the record being approved, so the subject
     * cannot be reached from it by navigation the way it can from an encounter or an enrolment. The
     * declarative rule generated for these form types binds
     * `const individual = params.entityContext && params.entityContext.individual`
     * (rules-config#41), so without this the base class's empty context leaves `individual` undefined and
     * a rule written against the subject's registration answers matches nothing rather than failing -
     * silent, and it reads in QA as "the rule does not work" with nothing in the logs.
     *
     * The subject is the approved entity itself when a registration is being approved, and its
     * `individual` for an encounter, a programme encounter or an enrolment - the same shape
     * FormMappingService.approvalCombinationFor switches on.
     */
    static approvedSubjectOf(approvedEntity) {
        if (_.isNil(approvedEntity)) return null;
        const isSubject = _.isFunction(approvedEntity.getSchemaName)
            && approvedEntity.getSchemaName() === Individual.schema.name;
        return isSubject ? approvedEntity : _.get(approvedEntity, 'individual', null);
    }

    getEntityContext() {
        return {individual: ApprovalFormState.approvedSubjectOf(this.approvedEntity)};
    }

    /**
     * The three fields below are load-bearing and easy to lose. onSave clones before reading
     * approvalStatusToApply, so dropping it here silently turns every rejection into an approval - the
     * status reads undefined and falls to the approve branch. Caught by ApprovalFormSaveTest.
     */
    clone() {
        const newState = new ApprovalFormState();
        newState.entityApprovalStatus = this.entityApprovalStatus;
        newState.displayProgressIndicator = this.displayProgressIndicator;
        newState.approvalStatusToApply = this.approvalStatusToApply;
        newState.approvedEntity = this.approvedEntity;
        newState.approvedEntitySchema = this.approvedEntitySchema;
        super.clone(newState);
        return newState;
    }

    /**
     * Whether a decision can be submitted with nothing filled in is the organisation's choice, expressed
     * through the form's own mandatory questions and enforced by AbstractDataEntryState. There is
     * deliberately no equivalent of the comment box's refusal to accept an empty comment.
     */
    validateEntity() {
        return [];
    }

    getEffectiveDataEntryDate() {
        return this.entityApprovalStatus.statusDateTime;
    }
}

export default ApprovalFormState;
