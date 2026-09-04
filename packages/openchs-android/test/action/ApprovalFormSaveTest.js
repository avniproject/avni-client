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
                            saved = {action: 'reject', entity, schema, comment, observations}
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
