/**
 * avni-client#2225: a new-visit crash ("Cannot read property 'name' of undefined") on pressing
 * Back from a later page after the wizard and formElementGroup had gone out of step (e.g. a
 * file-size alert on a File question). AbstractDataEntryState.movePrevious did
 *   this.wizard.movePrevious(); this.formElementGroup = this.formElementGroup.previous();
 * and previous() returns undefined when already at the first group, so formElementGroup became
 * undefined and the next handlePrevious dereferenced it (updateFormElements' Perf detail callback
 * reads formElementGroup.name; removeNonApplicableObs reads getFormElements()).
 *
 * Fix: compute previous() first and bail when it is nil — no earlier page to move to — so neither
 * the wizard nor formElementGroup is stepped into an invalid state.
 *
 *   npx jest --selectProjects unit --testPathPattern AbstractDataEntryStateMovePrevious
 */
import AbstractDataEntryState from "../../src/state/AbstractDataEntryState";

const movePrevious = AbstractDataEntryState.prototype.movePrevious;

function stateWith(formElementGroup) {
    return {
        isFirstFlow: false,   // skip the timer branch
        timerState: null,
        isDraft: false,
        wizard: { movePrevious: jest.fn() },
        formElementGroup,
    };
}

describe("AbstractDataEntryState.movePrevious (#2225)", () => {
    it("does not null out formElementGroup or step the wizard when there is no previous group", () => {
        const firstGroup = { name: "Page 1", previous: () => undefined };
        const state = stateWith(firstGroup);

        expect(() => movePrevious.call(state)).not.toThrow();
        expect(state.formElementGroup).toBe(firstGroup);      // unchanged, not undefined
        expect(state.wizard.movePrevious).not.toHaveBeenCalled();
    });

    it("moves to the previous group and steps the wizard when a previous group exists", () => {
        const page1 = { name: "Page 1" };
        const page2 = { name: "Page 2", previous: () => page1 };
        const state = stateWith(page2);

        movePrevious.call(state);
        expect(state.formElementGroup).toBe(page1);
        expect(state.wizard.movePrevious).toHaveBeenCalledTimes(1);
    });
});
