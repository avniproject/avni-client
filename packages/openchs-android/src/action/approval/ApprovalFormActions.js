import _ from "lodash";
import {ApprovalStatus, EntityApprovalStatus} from 'avni-models';
import ApprovalFormState from "../../state/ApprovalFormState";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import EntityApprovalStatusService from "../../service/EntityApprovalStatusService";
import General from "../../utility/General";

/**
 * The wizard behind an Approval or Rejection form (avniproject/avni-client#2091).
 *
 * Modelled on TaskActions, which drives TaskFormView the same way. The decision built on load is
 * deliberately unsaved and never written here: opening the form, paging through it and backing out must
 * all leave the record's approval status exactly as it was.
 *
 * The answers are carried into the save by onSave (avniproject/avni-client#2092) and belong to the
 * decision, never to the record being judged.
 */
class ApprovalFormActions {

    static getInitialState(context) {
        return ApprovalFormState.createEmptyState();
    }

    static onFormLoad(state, action, context) {
        const {entity, form, status, schema} = action;

        // An unsaved decision, purely to hold the answers while the form is open. Nothing is written until
        // onSave, which is what makes backing out of the form leave the approval status untouched.
        const decision = new EntityApprovalStatus();
        decision.uuid = General.randomUUID();
        decision.entityUUID = entity.uuid;
        decision.entityType = context.get(EntityApprovalStatusService).getEntityTypeForSchema(schema);
        decision.statusDateTime = new Date();
        decision.observations = [];

        const withContext = (loadedState) => {
            loadedState.approvalStatusToApply = status;
            loadedState.approvedEntity = entity;
            loadedState.approvedEntitySchema = schema;
            return loadedState;
        };

        if (_.isNil(form)) {
            return withContext(ApprovalFormState.createOnLoadStateForEmptyForm(decision, null));
        }

        const firstGroupWithAtLeastOneVisibleElement = _.find(
            _.sortBy(form.nonVoidedFormElementGroups(), (o) => o.displayOrder),
            (formElementGroup) => ApprovalFormActions.filterFormElements(formElementGroup, context, decision).length !== 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return withContext(ApprovalFormState.createOnLoadStateForEmptyForm(decision, form));
        }

        const formElementStatuses = context.get(RuleEvaluationService)
            .getFormElementsStatuses(decision, EntityApprovalStatus.schema.name, firstGroupWithAtLeastOneVisibleElement);
        const filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        return withContext(ApprovalFormState.createOnLoadState(decision, form,
            firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses));
    }

    static filterFormElements(formElementGroup, context, decision) {
        const formElementStatuses = context.get(RuleEvaluationService)
            .getFormElementsStatuses(decision, EntityApprovalStatus.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    /**
     * Applies the decision the approver came here to make, carrying the answers they gave. Nothing is
     * written before this point, which is what makes backing out of the form leave the approval status
     * untouched.
     *
     * The answers go to the decision, not to the record being judged - a record rejected, corrected and
     * rejected again keeps both sets, each against its own decision.
     *
     * A rejection reached through a form has no typed comment: the comment box is what a form replaces,
     * and the organisation expresses "you must give a reason" through its own mandatory questions.
     *
     * Both statuses are matched explicitly and anything else throws, rather than letting a final else
     * mean approve. A clone() that dropped approvalStatusToApply made this method see undefined and
     * record every form-based rejection as an approval - silently, because "not Rejected" was enough to
     * approve. The clone is fixed; this makes a repeat of that class of defect fail loudly at the point
     * of decision instead of quietly writing the opposite of what the approver chose.
     */
    static onSave(state, action, context) {
        const newState = state.clone();
        const service = context.get(EntityApprovalStatusService);
        const observations = newState.getEntity().observations;
        const statusToApply = newState.approvalStatusToApply;
        if (statusToApply === ApprovalStatus.statuses.Rejected) {
            service.rejectEntity(newState.approvedEntity, newState.approvedEntitySchema, null, observations);
        } else if (statusToApply === ApprovalStatus.statuses.Approved) {
            service.approveEntity(newState.approvedEntity, newState.approvedEntitySchema, observations);
        } else {
            throw new Error(`Approval form save reached with approvalStatusToApply='${statusToApply}'; expected '${ApprovalStatus.statuses.Approved}' or '${ApprovalStatus.statuses.Rejected}'. Refusing to guess the approver's decision.`);
        }
        action.cb();
        return newState;
    }
}

const ActionPrefix = 'ApprovalForm';

const ApprovalFormActionNames = {
    ON_FORM_LOAD: `${ActionPrefix}.ON_FORM_LOAD`,
    ON_NEXT: `${ActionPrefix}.ON_NEXT`,
    ON_PREVIOUS: `${ActionPrefix}.ON_PREVIOUS`,
    ON_SAVE: `${ActionPrefix}.ON_SAVE`,
    TOGGLE_MULTISELECT_ANSWER: `${ActionPrefix}.TOGGLE_MULTISELECT_ANSWER`,
    TOGGLE_SINGLESELECT_ANSWER: `${ActionPrefix}.TOGGLE_SINGLESELECT_ANSWER`,
    PRIMITIVE_VALUE_CHANGE: `${ActionPrefix}.PRIMITIVE_VALUE_CHANGE`,
    PRIMITIVE_VALUE_END_EDITING: `${ActionPrefix}.PRIMITIVE_VALUE_END_EDITING`,
    DATE_DURATION_CHANGE: `${ActionPrefix}.DATE_DURATION_CHANGE`,
    DURATION_CHANGE: `${ActionPrefix}.DURATION_CHANGE`,
    PHONE_NUMBER_CHANGE: `${ActionPrefix}.PHONE_NUMBER_CHANGE`,
    GROUP_QUESTION_VALUE_CHANGE: `${ActionPrefix}.GROUP_QUESTION_VALUE_CHANGE`,
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: `${ActionPrefix}.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE`,
};

const ApprovalFormActionMap = new Map([
    [ApprovalFormActionNames.ON_FORM_LOAD, ApprovalFormActions.onFormLoad],
    [ApprovalFormActionNames.ON_NEXT, ApprovalFormActions.onNext],
    [ApprovalFormActionNames.ON_PREVIOUS, ApprovalFormActions.onPrevious],
    [ApprovalFormActionNames.ON_SAVE, ApprovalFormActions.onSave],
    [ApprovalFormActionNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [ApprovalFormActionNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [ApprovalFormActionNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [ApprovalFormActionNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [ApprovalFormActionNames.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [ApprovalFormActionNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [ApprovalFormActionNames.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [ApprovalFormActionNames.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [ApprovalFormActionNames.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
]);

export {ApprovalFormActions, ApprovalFormActionNames, ApprovalFormActionMap}
