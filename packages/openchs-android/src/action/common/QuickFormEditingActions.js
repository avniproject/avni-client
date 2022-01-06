export default class QuickFormEditingActions {
    static moveToPage(newState, action, context, actionClass) {
        if (action.pageNumber) {
            let state = newState;
            while (state.wizard.currentPage !== action.pageNumber && !state.anyFailedResultForCurrentFEG()) {
                state = actionClass.onNext(state, action, context);
            }
            return state;
        } else {
            return newState;
        }
    }
}
