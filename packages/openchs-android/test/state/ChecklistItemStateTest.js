import ChecklistItemState from "../../src/state/ChecklistItemState";
import Wizard from "../../src/state/Wizard";
import {ChecklistItem} from "avni-models";
import {assert} from "chai";

// ChecklistItem.validate() in openchs-models returns null, unlike other entities which
// return a ValidationResult array. The state must normalize it, or the Next-merge spread crashes.
function createState() {
    const formElementGroup = {
        formElementIds: [],
        validate: () => [],
    };
    const checklistItem = ChecklistItem.create({checklist: {}, detail: {}});
    return new ChecklistItemState(formElementGroup, new Wizard(1), true, checklistItem, []);
}

const contextStub = {
    get: () => ({getSettings: () => ({devSkipValidation: false})}),
};

describe("ChecklistItemState", () => {
    it("validateEntity returns an empty array when the model validate returns null", () => {
        const state = createState();
        assert.deepEqual(state.validateEntity(), []);
    });

    it("merges validation results on next without crashing", () => {
        const state = createState();
        assert.doesNotThrow(() => state._handleNextInternal1(contextStub));
        assert.isFalse(state.anyFailedResultForCurrentFEG());
    });
});
