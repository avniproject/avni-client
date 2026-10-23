import ChecklistItemState from "../../src/state/ChecklistItemState";
import Wizard from "../../src/state/Wizard";
import {AbstractEncounter, ChecklistItem} from "avni-models";
import {assert} from "chai";

// ChecklistItem.validate() in openchs-models returns null, unlike other entities which
// return a ValidationResult array. The state must normalize it, or the Next-merge spread crashes.
function createState(wizard = new Wizard(1)) {
    const formElementGroup = {
        formElementIds: [],
        validate: () => [],
    };
    const checklistItem = ChecklistItem.create({checklist: {}, detail: {}});
    checklistItem.completionDate = new Date();
    return new ChecklistItemState(formElementGroup, wizard, true, checklistItem, []);
}

const contextStub = {
    get: () => ({getSettings: () => ({devSkipValidation: false})}),
};

describe("ChecklistItemState", () => {
    it("validateEntity passes the completion date when the model validate returns null", () => {
        const state = createState();
        assert.deepEqual(state.validateEntity().map(({success, formIdentifier}) => ({success, formIdentifier})),
            [{success: true, formIdentifier: AbstractEncounter.fieldKeys.COMPLETION_DATE}]);
    });

    it("blocks next when the completion date is cleared", () => {
        const state = createState();
        state.checklistItem.completionDate = null;
        state._handleNextInternal1(contextStub);
        assert.isTrue(state.anyFailedResultForCurrentFEG());
    });

    it("blocks next on the first visible page when the first group is hidden", () => {
        const state = createState(new Wizard(3, 2, 2));
        state.checklistItem.completionDate = null;
        state._handleNextInternal1(contextStub);
        assert.isTrue(state.anyFailedResultForCurrentFEG());
    });

    it("merges validation results on next without crashing", () => {
        const state = createState();
        assert.doesNotThrow(() => state._handleNextInternal1(contextStub));
        assert.isFalse(state.anyFailedResultForCurrentFEG());
    });
});
