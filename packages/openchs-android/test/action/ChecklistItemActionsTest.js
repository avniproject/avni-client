import {ChecklistItemActions} from "../../src/action/program/ChecklistItemActions";
import ChecklistItemState from "../../src/state/ChecklistItemState";
import {ChecklistItem} from "avni-models";
import {assert} from "chai";

const notBlocked = () => { throw new Error("Next was not blocked"); };

function group(uuid) {
    return {uuid, formElementIds: [], name: uuid, validate: () => [], getFormElements: () => [], filterElements: () => [], next: notBlocked};
}

const hiddenFirstGroup = group("hidden");
const firstVisibleGroup = group("visible");
const form = {numberOfPages: 3, getFormElementGroups: () => [hiddenFirstGroup, firstVisibleGroup, group("third")]};

const contextStub = {
    get: () => ({getSettings: () => ({devSkipValidation: false}), getFormElementsStatuses: () => [], validateAgainstRule: notBlocked}),
};

const newChecklistItem = () => ChecklistItem.create({checklist: {}, detail: {}});

const loads = [
    ["an ordinary form", () => ChecklistItemState.createOnLoadStateForEmptyForm(newChecklistItem(), form, false)],
    ["a form whose first group is hidden", () => ChecklistItemState.createOnLoad(newChecklistItem(), form, false, firstVisibleGroup, [])],
];

function next(state) {
    let validationFailed = false;
    const afterNext = ChecklistItemActions.onNext(state, {validationFailed: () => validationFailed = true}, contextStub);
    return {afterNext, validationFailed};
}

describe("ChecklistItemActions completion date", () => {
    loads.forEach(([formKind, load]) => {
        describe(formKind, () => {
            it("defaults the completion date to today on load", () => {
                assert.isNotNull(load().checklistItem.completionDate);
            });

            it("blocks Next after the date is cleared, and keeps it cleared", () => {
                const cleared = ChecklistItemActions.encounterDateTimeChanged(load(), {value: null}, contextStub);
                const {afterNext, validationFailed} = next(cleared);
                assert.isTrue(validationFailed);
                assert.isNull(afterNext.checklistItem.completionDate);
            });

            it("does not block Next with the loaded date", () => {
                assert.throws(() => next(load()), "Next was not blocked");
            });
        });
    });

    it("keeps a cleared date across Previous", () => {
        const [, load] = loads[1];
        const cleared = ChecklistItemActions.encounterDateTimeChanged(load(), {value: null}, contextStub);
        assert.isNull(cleared.clone().checklistItem.completionDate);
    });
});
