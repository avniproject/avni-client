import {assert} from 'chai';
import {ApprovalStatus, EntityApprovalStatus, Individual, Observation} from 'avni-models';
import {ApprovalFormActions} from "../../src/action/approval/ApprovalFormActions";
import {ApprovalActions} from "../../src/action/approval/ApprovalActions";
import ApprovalFormState from "../../src/state/ApprovalFormState";
import EntityApprovalStatusService from "../../src/service/EntityApprovalStatusService";
import General from "../../src/utility/General";

/**
 * avniproject/avni-client#2092 - submitting the form applies the decision and carries the answers with it.
 *
 * The modal path is asserted alongside deliberately. Both flows converge on the same service methods, so
 * the only thing separating "the form's answers are saved" from "the comment box invented some answers" is
 * what each action passes - which is exactly what these tests pin.
 */
describe('ApprovalFormSave', () => {
    let saved;

    function anAnswer(conceptUuid) {
        const observation = new Observation();
        observation.concept = {uuid: conceptUuid, name: 'Rejection reason'};
        observation.valueJSON = JSON.stringify({answer: 'Wrong address'});
        return observation;
    }

    function context() {
        return {
            get: (type) => {
                if (type === EntityApprovalStatusService) {
                    return {
                        approveEntity: (entity, schema, observations) =>
                            saved = {action: 'approve', entity, schema, observations},
                        rejectEntity: (entity, schema, comment, observations) =>
                            saved = {action: 'reject', entity, schema, comment, observations},
                        updateDecisionAnswers: (decision, observations) =>
                            saved = {action: 'updateAnswers', decision, observations}
                    };
                }
                return {};
            }
        };
    }

    function aFormState(status, answers) {
        const decision = new EntityApprovalStatus();
        decision.uuid = General.randomUUID();
        decision.entityUUID = 'entity-uuid';
        decision.entityType = EntityApprovalStatus.entityType.Subject;
        decision.observations = answers;

        const state = ApprovalFormState.createOnLoadStateForEmptyForm(decision, null);
        state.approvalStatusToApply = status;
        state.approvedEntity = {uuid: 'entity-uuid'};
        state.approvedEntitySchema = Individual.schema.name;
        return state;
    }

    beforeEach(() => {
        saved = undefined;
    });

    it('carries the answers through when a rejection form is submitted', () => {
        const answers = [anAnswer('concept-1')];

        ApprovalFormActions.onSave(aFormState(ApprovalStatus.statuses.Rejected, answers), {cb: () => {}}, context());

        assert.equal('reject', saved.action);
        assert.equal(1, saved.observations.length, 'the answers must reach the service');
        assert.equal('concept-1', saved.observations[0].concept.uuid);
    });

    it('carries the answers through when an approval form is submitted', () => {
        const answers = [anAnswer('concept-2')];

        ApprovalFormActions.onSave(aFormState(ApprovalStatus.statuses.Approved, answers), {cb: () => {}}, context());

        assert.equal('approve', saved.action);
        assert.equal(1, saved.observations.length);
        assert.equal('concept-2', saved.observations[0].concept.uuid);
    });

    it('submits an empty answer set when the form was left blank', () => {
        ApprovalFormActions.onSave(aFormState(ApprovalStatus.statuses.Rejected, []), {cb: () => {}}, context());

        assert.equal(0, saved.observations.length);
    });

    /**
     * The clone defect this story fixed made onSave see an undefined approvalStatusToApply, and the old
     * "not Rejected means approve" else recorded those as approvals. These pin the guard that makes the
     * same class of defect throw instead: nothing is written, and the approver's decision is never
     * guessed. Pending is included because it is a real ApprovalStatus value that must never arrive here.
     */
    it('refuses to save when the decision was lost rather than approving by default', () => {
        assert.throws(
            () => ApprovalFormActions.onSave(aFormState(undefined, []), {cb: () => {}}, context()),
            /Refusing to guess/);

        assert.isUndefined(saved, 'nothing may be written when the decision is unknown');
    });

    it('refuses to save a Pending decision', () => {
        assert.throws(
            () => ApprovalFormActions.onSave(aFormState(ApprovalStatus.statuses.Pending, []), {cb: () => {}}, context()),
            /Refusing to guess/);

        assert.isUndefined(saved);
    });

    it('does not run the callback when it refuses to save', () => {
        let calledBack = false;

        assert.throws(() => ApprovalFormActions.onSave(
            aFormState(undefined, []), {cb: () => calledBack = true}, context()));

        assert.isFalse(calledBack, 'the screen must not proceed as though the decision was applied');
    });

    /**
     * Correcting a decision that is already recorded. The status is not re-applied - approveEntity would
     * write a second Approved row and, because the current status is the latest row by statusDateTime,
     * silently re-date the approval as well. Only the answers change.
     */
    it('replaces the answers on the decision being corrected instead of recording another one', () => {
        const state = aFormState(ApprovalStatus.statuses.Approved, [anAnswer('concept-3')]);
        state.editingDecision = true;

        ApprovalFormActions.onSave(state, {cb: () => {}}, context());

        assert.equal('updateAnswers', saved.action,
            'a correction must not go through approveEntity - that writes a second decision');
        assert.equal('concept-3', saved.observations[0].concept.uuid);
        assert.equal(state.getEntity().uuid, saved.decision.uuid, 'the correction lands on the same row');
    });

    it('runs the callback after a correction, so the approver is returned to the record', () => {
        const state = aFormState(ApprovalStatus.statuses.Rejected, []);
        state.editingDecision = true;
        let calledBack = false;

        ApprovalFormActions.onSave(state, {cb: () => calledBack = true}, context());

        assert.isTrue(calledBack);
    });

    /**
     * The correction branch is reached before the status guard, so a correction with a lost status must
     * still be safe rather than throwing - there is no decision being made for it to guess at.
     */
    it('corrects without needing the status, which a correction never applies', () => {
        const state = aFormState(undefined, [anAnswer('concept-4')]);
        state.editingDecision = true;

        ApprovalFormActions.onSave(state, {cb: () => {}}, context());

        assert.equal('updateAnswers', saved.action);
    });

    // The modal path, which shares the service methods

    it('the comment box rejection passes the comment and no answers', () => {
        const state = {rejectionComment: 'Address did not match', openDialog: true};

        ApprovalActions.onReject(state, {
            entity: {uuid: 'entity-uuid'}, schema: Individual.schema.name, cb: () => {}
        }, context());

        assert.equal('reject', saved.action);
        assert.equal('Address did not match', saved.comment);
        assert.isNotOk(saved.observations, 'the modal must not send answers');
    });

    it('the comment box approval passes no answers', () => {
        ApprovalActions.onApprove({openDialog: true}, {
            entity: {uuid: 'entity-uuid'}, schema: Individual.schema.name, cb: () => {}
        }, context());

        assert.equal('approve', saved.action);
        assert.isNotOk(saved.observations);
    });
});
