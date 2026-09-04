import AbstractDataEntryState from "./AbstractDataEntryState";
import _ from "lodash";
import {EntityApprovalStatus, ObservationsHolder, StaticFormElementGroup} from 'avni-models';
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

    clone() {
        const newState = new ApprovalFormState();
        newState.entityApprovalStatus = this.entityApprovalStatus;
        newState.displayProgressIndicator = this.displayProgressIndicator;
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
