import {assert} from 'chai';
import {EntityApprovalStatus} from 'avni-models';
import ApprovalFormState from "../../src/state/ApprovalFormState";

/**
 * avniproject/avni-client#2091 - what ApprovalFormView is allowed to read off this.state.
 *
 * AbstractComponent.refreshState hands the store's state to React's setState, which shallow-merges it
 * into a fresh object. The fields survive; the ApprovalFormState prototype does not. So a method call on
 * this.state inside render is undefined at runtime, which is what "this.state.getEntity is not a
 * function" was - the view reached for getEntity() where TaskFormView, the view it was modelled on,
 * reads this.state.task.
 *
 * These pin the shape the view depends on. They cannot render the view - it reaches native modules - so
 * they assert against the same shallow copy React produces, which is where the guarantee actually lies.
 */
describe('ApprovalFormState shape after React shallow-merges it', () => {

    function aLoadedState() {
        const decision = new EntityApprovalStatus();
        decision.uuid = 'decision-uuid';
        decision.statusDateTime = new Date();
        decision.observations = [];

        const state = ApprovalFormState.createOnLoadStateForEmptyForm(decision, null);
        state.approvedEntity = {uuid: 'entity-uuid'};
        return state;
    }

    // What React does to it: own enumerable properties onto a plain object.
    function asReactWouldStoreIt(state) {
        return {...state};
    }

    it('keeps the decision reachable as a field, which is what render reads', () => {
        const stored = asReactWouldStoreIt(aLoadedState());

        assert.isDefined(stored.entityApprovalStatus, 'render reads this.state.entityApprovalStatus');
        assert.equal('decision-uuid', stored.entityApprovalStatus.uuid);
        assert.isDefined(stored.entityApprovalStatus.observations);
        assert.isDefined(stored.entityApprovalStatus.statusDateTime);
    });

    it('keeps the other fields render reads', () => {
        const stored = asReactWouldStoreIt(aLoadedState());

        ['formElementGroup', 'validationResults', 'filteredFormElements', 'wizard'].forEach((field) =>
            assert.isDefined(stored[field], `render reads this.state.${field}`));
    });

    /**
     * The reason the field is read rather than the method. If this ever becomes false the prototype is
     * being preserved and the constraint has changed - but until then, a method call in render is a bug.
     */
    it('loses the prototype, so methods are not available on it', () => {
        const stored = asReactWouldStoreIt(aLoadedState());

        assert.isUndefined(stored.getEntity,
            'a method call on this.state in render would throw - read the field instead');
        assert.isFunction(aLoadedState().getEntity,
            'the real state still has it, for the action layer and for states passed directly');
    });

    it('wizard keeps its own behaviour, since the field holds the instance', () => {
        const stored = asReactWouldStoreIt(aLoadedState());

        assert.isFunction(stored.wizard.isFirstPage,
            'previous() calls this.state.wizard.isFirstPage() and must keep working');
    });
});
