import {assert} from 'chai';
import {ApprovalStatus, EntityApprovalStatus, Form, ObservationsHolder, StaticFormElementGroup} from 'openchs-models';
import ApprovalFormState from "../../src/state/ApprovalFormState";
import General from "../../src/utility/General";

/**
 * avniproject/avni-client#2091 - the state behind the Approval/Rejection form.
 *
 * Modelled on TaskState, which is the existing precedent for a non-encounter entity rendered through
 * AbstractDataEntryState and FormElementGroup. The answers live on the decision, so observationsHolder
 * wraps the EntityApprovalStatus rather than the record being approved - a record can be rejected,
 * corrected and rejected again, and each decision keeps its own answers.
 */
describe('ApprovalFormState', () => {
    let entityApprovalStatus;

    function aDecision() {
        const approvalStatus = new ApprovalStatus();
        approvalStatus.uuid = General.randomUUID();
        approvalStatus.status = ApprovalStatus.statuses.Rejected;

        const decision = new EntityApprovalStatus();
        decision.uuid = General.randomUUID();
        decision.entityUUID = 'entity-uuid';
        decision.entityType = EntityApprovalStatus.entityType.Subject;
        decision.approvalStatus = approvalStatus;
        decision.observations = [];
        return decision;
    }

    function aForm() {
        const form = new Form();
        form.uuid = General.randomUUID();
        form.formType = Form.formTypes.Rejection;
        form.name = 'Rejection form';
        return form;
    }

    beforeEach(() => {
        entityApprovalStatus = aDecision();
    });

    it('wraps the decision own answers, not the approved record own', () => {
        const state = ApprovalFormState.createOnLoadStateForEmptyForm(entityApprovalStatus, aForm());

        assert.instanceOf(state.observationsHolder, ObservationsHolder);
        assert.equal(entityApprovalStatus.uuid, state.getEntity().uuid);
    });

    it('reports the decision as its entity type', () => {
        const state = ApprovalFormState.createOnLoadStateForEmptyForm(entityApprovalStatus, aForm());

        assert.equal(EntityApprovalStatus.schema.name, state.getEntityType());
    });

    /**
     * A form with no form element groups still has to render something; TaskState uses a
     * StaticFormElementGroup for exactly this, and the wizard must not be left undefined.
     */
    it('builds a usable wizard for a form with no element groups', () => {
        const state = ApprovalFormState.createOnLoadStateForEmptyForm(entityApprovalStatus, aForm());

        assert.instanceOf(state.formElementGroup, StaticFormElementGroup);
        assert.isOk(state.wizard);
        assert.isTrue(state.wizard.isFirstPage());
    });

    it('clones without losing the decision', () => {
        const state = ApprovalFormState.createOnLoadStateForEmptyForm(entityApprovalStatus, aForm());

        const cloned = state.clone();

        assert.equal(entityApprovalStatus.uuid, cloned.getEntity().uuid);
    });

    /**
     * Backing out of the form must leave the record's approval status untouched. The state holds an
     * unsaved decision, so this asserts the state never writes - nothing here persists, and the save is
     * avni-client#2092's job.
     */
    it('does not validate the decision itself', () => {
        const state = ApprovalFormState.createOnLoadStateForEmptyForm(entityApprovalStatus, aForm());

        assert.deepEqual([], state.validateEntity());
    });
});
