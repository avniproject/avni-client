import QuickFormEditingActions from "../../../src/action/common/QuickFormEditingActions";
import Wizard from "../../../src/state/Wizard";

describe("QuickFormEditingActions.moveToPage", () => {
    const formState = (numberOfPages, {failsOnPage, skips = {}, stuckOnPage} = {}) => {
        const state = {wizard: new Wizard(numberOfPages, 1, 1)};
        state.anyFailedResultForCurrentFEG = () => state.wizard.currentPage === failsOnPage;
        const actionClass = {
            nexts: 0,
            onNext(s) {
                this.nexts++;
                if (s.wizard.isLastPage() || s.wizard.currentPage === stuckOnPage) return s;
                s.wizard.currentPage = skips[s.wizard.currentPage] || s.wizard.currentPage + 1;
                return s;
            },
            async onNextAsync(s) {
                return this.onNext(s);
            }
        };
        return {state, actionClass};
    };

    it("lands on the saved page", () => {
        const {state, actionClass} = formState(4);
        expect(QuickFormEditingActions.moveToPage(state, {pageNumber: 3}, {}, actionClass).wizard.currentPage).toBe(3);
    });

    it("stops on the last page when a sync has shortened the form below the saved page", () => {
        const {state, actionClass} = formState(3);
        expect(QuickFormEditingActions.moveToPage(state, {pageNumber: 5}, {}, actionClass).wizard.currentPage).toBe(3);
        expect(actionClass.nexts).toBe(2);
    });

    it("stops at a page that fails validation", () => {
        const {state, actionClass} = formState(4, {failsOnPage: 2});
        expect(QuickFormEditingActions.moveToPage(state, {pageNumber: 4}, {}, actionClass).wizard.currentPage).toBe(2);
    });

    it("stops past the saved page when skip logic now hides it", () => {
        const {state, actionClass} = formState(5, {skips: {2: 4}});
        expect(QuickFormEditingActions.moveToPage(state, {pageNumber: 3}, {}, actionClass).wizard.currentPage).toBe(4);
    });

    it("stops when Next does not move the page", () => {
        const {state, actionClass} = formState(5, {stuckOnPage: 2});
        expect(QuickFormEditingActions.moveToPage(state, {pageNumber: 4}, {}, actionClass).wizard.currentPage).toBe(2);
        expect(actionClass.nexts).toBe(2);
    });

    it("does the same for the async page jump", async () => {
        const {state, actionClass} = formState(3);
        expect((await QuickFormEditingActions.moveToPageAsync(state, {pageNumber: 5}, {}, actionClass)).wizard.currentPage).toBe(3);
    });

    it("leaves the state alone without a saved page", () => {
        const {state, actionClass} = formState(3);
        expect(QuickFormEditingActions.moveToPage(state, {}, {}, actionClass).wizard.currentPage).toBe(1);
        expect(actionClass.nexts).toBe(0);
    });
});
