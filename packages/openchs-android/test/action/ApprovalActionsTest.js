import {assert} from 'chai';
import {ApprovalActions} from "../../src/action/approval/ApprovalActions";
import FormMappingService from "../../src/service/FormMappingService";
import PrivilegeService from "../../src/service/PrivilegeService";

/**
 * avniproject/avni-client#2091 - pressing Approve or Reject opens the mapped form when there is one, and
 * otherwise opens today's comment box unchanged.
 *
 * The fallback is the load-bearing half. Every organisation has no form attached on day one, and a device
 * that has not finished syncing form metadata also resolves no mapping - so "no form mapped" must be
 * indistinguishable from today's behaviour, not merely similar to it. Both paths are asserted separately;
 * a branch that always falls through to the modal is exactly what this story looks like when broken.
 */
describe('ApprovalActionsTest', () => {
    const I18n = {t: (key) => key};

    let navigatedTo, approvalForm, rejectionForm;

    function anEntity() {
        return {
            uuid: 'entity-uuid',
            getName: () => 'Rejection',
            getSchemaName: () => 'Individual',
            individual: {nameString: 'Test Subject'}
        };
    }

    function context() {
        return {
            get: (type) => {
                if (type === FormMappingService) {
                    return {
                        findApprovalFormFor: () => approvalForm,
                        findRejectionFormFor: () => rejectionForm
                    };
                }
                if (type === PrivilegeService) {
                    return {displayApprovalEntityButtons: () => true, displayEditEntityButton: () => true};
                }
                return {};
            }
        };
    }

    function action(extra = {}) {
        return {entity: anEntity(), I18n, navigateToForm: (form) => navigatedTo = form, ...extra};
    }

    beforeEach(() => {
        navigatedTo = undefined;
        approvalForm = null;
        rejectionForm = null;
    });

    // With a form mapped

    it('opens the rejection form when one is mapped', () => {
        rejectionForm = {uuid: 'rejection-form', formType: 'Rejection'};

        const state = ApprovalActions.onRejectPress(ApprovalActions.getInitialState(), action(), context());

        assert.equal(rejectionForm, navigatedTo, 'the mapped rejection form should be opened');
        assert.isFalse(state.openDialog, 'the comment box must not also open');
    });

    it('opens the approval form when one is mapped', () => {
        approvalForm = {uuid: 'approval-form', formType: 'Approval'};

        const state = ApprovalActions.onApprovePress(ApprovalActions.getInitialState(), action(), context());

        assert.equal(approvalForm, navigatedTo);
        assert.isFalse(state.openDialog);
    });

    /**
     * Each button independently uses a form or the modal. An organisation that wants coded rejection
     * reasons is not obliged to build an approval form as well - which is the commoner configuration,
     * since this feature exists for rejection reasons.
     */
    it('uses the form for reject and the modal for approve when only a rejection form is mapped', () => {
        rejectionForm = {uuid: 'rejection-form', formType: 'Rejection'};

        const rejectState = ApprovalActions.onRejectPress(ApprovalActions.getInitialState(), action(), context());
        assert.equal(rejectionForm, navigatedTo);
        assert.isFalse(rejectState.openDialog);

        navigatedTo = undefined;
        const approveState = ApprovalActions.onApprovePress(ApprovalActions.getInitialState(), action(), context());
        assert.isUndefined(navigatedTo, 'approve has no form mapped, so nothing should be opened');
        assert.isTrue(approveState.openDialog);
    });

    // With nothing mapped - today's behaviour, unchanged

    it('opens the comment box for reject when no form is mapped', () => {
        const state = ApprovalActions.onRejectPress(ApprovalActions.getInitialState(), action(), context());

        assert.isUndefined(navigatedTo);
        assert.isTrue(state.openDialog);
        assert.isTrue(state.showInputBox, 'rejection still asks for a typed reason');
        assert.equal('', state.rejectionComment);
        assert.equal('rejectRequestTitle', state.title);
        assert.equal('rejectRequestMsg', state.message);
    });

    it('opens the comment box for approve when no form is mapped', () => {
        const state = ApprovalActions.onApprovePress(ApprovalActions.getInitialState(), action(), context());

        assert.isUndefined(navigatedTo);
        assert.isTrue(state.openDialog);
        assert.isFalse(state.showInputBox, 'approval has never asked for a typed comment');
        assert.equal('approveRequestTitle', state.title);
        assert.equal('approveRequestMsg', state.message);
    });

    /**
     * The reducer is reachable from callers that do not supply the callback. It must fall back rather
     * than throw, because throwing here would break the approval screen outright.
     */
    it('falls back to the comment box when no navigate callback is supplied', () => {
        rejectionForm = {uuid: 'rejection-form', formType: 'Rejection'};

        const state = ApprovalActions.onRejectPress(
            ApprovalActions.getInitialState(), action({navigateToForm: undefined}), context());

        assert.isTrue(state.openDialog);
    });
});
