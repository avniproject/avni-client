import _ from "lodash";
import {ApprovalStatus, EntityApprovalStatus, ObservationsHolder} from 'avni-models';
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
 *
 * The same wizard reopens a decision that is already recorded, so the approver can correct what they
 * answered (avniproject/avni-client#2093). Everything about that path is conditional on
 * `existingDecision`: which row is filled in, which page it opens at, and what onSave does with it.
 */
class ApprovalFormActions {

    static getInitialState(context) {
        return ApprovalFormState.createEmptyState();
    }

    /**
     * The decision the form fills in while it is open (avniproject/avni-client#2093).
     *
     * Making a decision builds a new one; correcting a recorded decision reopens that one - same uuid,
     * same status date - so the correction lands on the row that already exists rather than adding a
     * second decision to the record's history.
     *
     * The answers are cloned rather than handed over. The stored ones are live Realm objects: writing to
     * them outside a transaction throws, and reading them back after an edit that was abandoned would
     * show the abandoned answers. A clone keeps "back out and nothing changed" true for corrections as
     * well as for first decisions.
     */
    static workingDecisionFor(action, context) {
        const {entity, schema, existingDecision} = action;
        const decision = new EntityApprovalStatus();
        decision.entityUUID = entity.uuid;
        decision.entityType = context.get(EntityApprovalStatusService).getEntityTypeForSchema(schema);
        if (_.isNil(existingDecision)) {
            decision.uuid = General.randomUUID();
            decision.statusDateTime = new Date();
            decision.observations = [];
        } else {
            decision.uuid = existingDecision.uuid;
            decision.statusDateTime = existingDecision.statusDateTime;
            decision.observations = ObservationsHolder.clone(existingDecision.observations);
        }
        return decision;
    }

    static onFormLoad(state, action, context) {
        const {entity, form, status, schema, existingDecision} = action;

        // Unsaved while the form is open. Nothing is written until onSave, which is what makes backing out
        // of the form leave the approval status - and a recorded decision's answers - untouched.
        const decision = ApprovalFormActions.workingDecisionFor(action, context);

        const withContext = (loadedState) => {
            loadedState.approvalStatusToApply = status;
            loadedState.approvedEntity = entity;
            loadedState.approvedEntitySchema = schema;
            loadedState.editingDecision = !_.isNil(existingDecision);
            return loadedState;
        };

        if (_.isNil(form)) {
            return withContext(ApprovalFormState.createOnLoadStateForEmptyForm(decision, null));
        }

        // Rules on these forms reach the subject only through entityContext - an EntityApprovalStatus
        // carries just the UUID and type of the record being approved. ObservationsHolderActions passes
        // state.getEntityContext() on every later cycle, but the state does not exist yet on load, so the
        // same context is built from the entity here. Without it the first page evaluates with
        // `individual` undefined and a registration-scoped rule silently matches nothing.
        const entityContext = {individual: ApprovalFormState.approvedSubjectOf(entity)};

        const firstGroupWithAtLeastOneVisibleElement = _.find(
            _.sortBy(form.nonVoidedFormElementGroups(), (o) => o.displayOrder),
            (formElementGroup) => ApprovalFormActions.filterFormElements(formElementGroup, context, decision, entityContext).length !== 0);

        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return withContext(ApprovalFormState.createOnLoadStateForEmptyForm(decision, form));
        }

        const formElementStatuses = context.get(RuleEvaluationService)
            .getFormElementsStatuses(decision, EntityApprovalStatus.schema.name, firstGroupWithAtLeastOneVisibleElement, entityContext);
        const filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        const loadedState = withContext(ApprovalFormState.createOnLoadState(decision, form,
            firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses));
        return ApprovalFormActions.moveToNamedPage(loadedState, action, context);
    }

    /**
     * Opens the form at the page an Edit link named, when one did (avniproject/avni-client#2093).
     *
     * The wizard is walked rather than jumped to, because each page on the way runs the rule evaluation
     * the pages after it depend on - the same reason the registration and encounter quick edits walk.
     *
     * It walks forward only, and stops as soon as a step fails to advance. The shared
     * QuickFormEditingActions helper loops on `currentPage !== target`, which is safe for a form that
     * always opens on page one and is not safe here: this one opens at the first page carrying a visible
     * question, so it can already be past the target, and that loop would never end.
     */
    static moveToNamedPage(loadedState, action, context) {
        const targetPage = action.pageNumber;
        if (!targetPage) return loadedState;
        let state = loadedState;
        while (state.wizard.currentPage < targetPage && !state.anyFailedResultForCurrentFEG()) {
            const pageBefore = state.wizard.currentPage;
            state = ApprovalFormActions.onNext(state, action, context);
            if (state.wizard.currentPage <= pageBefore) break;
        }
        return state;
    }

    static filterFormElements(formElementGroup, context, decision, entityContext = {}) {
        const formElementStatuses = context.get(RuleEvaluationService)
            .getFormElementsStatuses(decision, EntityApprovalStatus.schema.name, formElementGroup, entityContext);
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
     *
     * Correcting a recorded decision (avniproject/avni-client#2093) takes the other branch entirely: the
     * answers are replaced on the row that already exists and no decision is applied, because none is
     * being made. Routing a correction through approveEntity would write a second Approved row and
     * re-date the approval.
     */
    static onSave(state, action, context) {
        const newState = state.clone();
        const service = context.get(EntityApprovalStatusService);
        const observations = newState.getEntity().observations;
        const statusToApply = newState.approvalStatusToApply;
        if (newState.editingDecision) {
            service.updateDecisionAnswers(newState.getEntity(), observations);
            action.cb();
            return newState;
        }
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
