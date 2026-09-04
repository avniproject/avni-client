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
 * Note for reviewers: the answers the approver gives do not persist yet. This story opens the form;
 * carrying the answers through the save path is avniproject/avni-client#2092, at which point onSave stops
 * discarding state.getEntity().observations.
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
        decision.entityType = context.get(EntityApprovalStatusService)._getEntityTypeForSchema(schema);
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
     * Applies the decision the approver came here to make. The answers are not carried yet - see the class
     * comment; that is avniproject/avni-client#2092. Nothing is written before this point, which is what
     * makes backing out of the form safe.
     */
    static onSave(state, action, context) {
        const newState = state.clone();
        const service = context.get(EntityApprovalStatusService);
        if (newState.approvalStatusToApply === ApprovalStatus.statuses.Rejected) {
            service.rejectEntity(newState.approvedEntity, newState.approvedEntitySchema, null);
        } else {
            service.approveEntity(newState.approvedEntity, newState.approvedEntitySchema);
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
