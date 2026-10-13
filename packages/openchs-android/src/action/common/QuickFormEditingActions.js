export default class QuickFormEditingActions {
    // A saved page number can lie past the end once a sync shortens the form, and Next on the last page
    // starts the save instead of moving, so stop at the last page and whenever a step does not advance.
    static targetPage(state, action) {
        return Math.min(action.pageNumber, state.wizard.numberOfPages);
    }

    static moveToPage(newState, action, context, actionClass) {
        if (!action.pageNumber) return newState;
        const targetPage = QuickFormEditingActions.targetPage(newState, action);
        let state = newState;
        while (state.wizard.currentPage < targetPage && !state.anyFailedResultForCurrentFEG()) {
            const pageBefore = state.wizard.currentPage;
            state = actionClass.onNext(state, action, context);
            if (state.wizard.currentPage <= pageBefore) break;
        }
        return state;
    }

    static async moveToPageAsync(newState, action, context, actionClass) {
        if (!action.pageNumber) return newState;
        const targetPage = QuickFormEditingActions.targetPage(newState, action);
        let state = newState;
        while (state.wizard.currentPage < targetPage && !state.anyFailedResultForCurrentFEG()) {
            const pageBefore = state.wizard.currentPage;
            state = await actionClass.onNextAsync(state, action, context);
            if (state.wizard.currentPage <= pageBefore) break;
        }
        return state;
    }
}
