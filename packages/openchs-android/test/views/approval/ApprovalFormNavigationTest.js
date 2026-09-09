import {assert} from 'chai';

// ApprovalDetailsView transitively imports AppHeader -> CHSNavigator -> the whole view layer, which
// bottoms out in native modules that cannot load under jest. Same treatment DecisionMessageLoadTest
// gives Observations: jest.mock still resolves the paths, so a wrong import path fails here rather than
// at build time. Neither component takes part in the navigation call under test.
jest.mock("../../../src/views/common/AppHeader", () => "AppHeader");
jest.mock("../../../src/views/common/Observations", () => "Observations");
jest.mock("../../../src/utility/CHSNavigator", () => ({}));
// The reducer index imports the whole action layer and bottoms out in a long tail of native-only
// modules. The view imports it only to name its reducer key in the constructor, and the method under
// test never touches it.
jest.mock("../../../src/reducer", () => ({reducerKeys: {approval: 'approval'}}));
// The destination view renders form elements, which reach native inputs. The test only needs its
// identity, and jest hands the same stub to the view under test and to this file - so asserting the
// navigation targets it is still a real check.
jest.mock("../../../src/views/approval/ApprovalFormView", () => ({path: () => '/approvalFormView'}));

import {ApprovalStatus, Individual} from 'openchs-models';
import ApprovalDetailsView from "../../../src/views/approval/ApprovalDetailsView";
import ApprovalFormView from "../../../src/views/approval/ApprovalFormView";
import TypedTransition from "../../../src/framework/routing/TypedTransition";

/**
 * avniproject/avni-client#2091 - handing the approver from the decision screen to the mapped Approval or
 * Rejection form.
 *
 * The lookup and the state were covered; this hand-off was not, and both of its trailing calls were wrong.
 *
 * Router spreads a route's queryParams onto the view only when isTyped is set, and otherwise nests them
 * under a `params` prop. Without it ApprovalFormView receives no entity, schema or form, and onFormLoad
 * crashes on `entity.uuid` the moment the form opens - so the feature could never open a form on a device
 * at all. bookmark() is the other half: ApprovalFormView#next pops to the bookmark after the decision is
 * saved, and popToBookmark silently does nothing when none was set.
 *
 * These assert the shape of the navigation call rather than the rendered screen, which is what the defect
 * was in. TaskStatusPicker makes the identical pair of calls for TaskFormView.
 */
describe('ApprovalFormNavigation', () => {
    let calls;
    let originalFrom;

    function anEntity() {
        const entity = new Individual();
        entity.uuid = 'entity-uuid';
        entity.getSchemaName = () => Individual.schema.name;
        return entity;
    }

    beforeEach(() => {
        calls = {with: null, bookmarked: false, to: null};
        originalFrom = TypedTransition.from;
        const chain = {
            with(queryParams) {
                calls.with = queryParams;
                return chain;
            },
            bookmark() {
                calls.bookmarked = true;
                return chain;
            },
            to(viewClass, isTyped) {
                calls.to = {viewClass, isTyped};
                return chain;
            }
        };
        TypedTransition.from = () => chain;
    });

    afterEach(() => {
        TypedTransition.from = originalFrom;
    });

    function navigate(entity, status = ApprovalStatus.statuses.Rejected, titleKey = 'reject') {
        const view = {};
        const form = {uuid: 'form-uuid'};
        ApprovalDetailsView.prototype.navigateToApprovalForm.call(view, entity, status, titleKey)(form);
        return form;
    }

    it('spreads the parameters onto the form view rather than nesting them under params', () => {
        navigate(anEntity());

        assert.equal(ApprovalFormView, calls.to.viewClass);
        assert.isTrue(calls.to.isTyped,
            'isTyped must be true - Router nests queryParams under a params prop without it, so ' +
            'ApprovalFormView gets no entity and onFormLoad dereferences undefined');
    });

    it('bookmarks the current screen so the approver is returned there after saving', () => {
        navigate(anEntity());

        assert.isTrue(calls.bookmarked,
            'ApprovalFormView#next calls popToBookmark, which does nothing when no bookmark was set');
    });

    it('passes the entity, its schema, the form, the status and the title', () => {
        const entity = anEntity();

        const form = navigate(entity, ApprovalStatus.statuses.Approved, 'approve');

        assert.equal(entity, calls.with.entity);
        assert.equal(Individual.schema.name, calls.with.schema);
        assert.equal(form, calls.with.form);
        assert.equal(ApprovalStatus.statuses.Approved, calls.with.status);
        assert.equal('approve', calls.with.title);
    });
});
