import _ from "lodash";
import General from "../../utility/General";

// Safety valve: if an async decision rule (e.g. edge-model inference) never settles, release the
// in-progress lock after this long so the blocking indicator can't freeze the wizard forever.
const WIZARD_COMPLETION_TIMEOUT_MS = 30000;

/**
 * Runs an async last-page/summary completion behind a re-entrancy lock so the verdict step can't be
 * skipped or double-fired while a decision rule is still resolving. Reducers must stay synchronous,
 * so the async runner is fired in the background; the lock is set on the returned state and released
 * on settle or on a timeout fallback (surfaced to the view via action.settleCompletion).
 */
export function runWizardCompletion(newState, action, runner, errorContext) {
    newState.wizardCompletionInProgress = true;
    let settled = false;
    const settle = () => {
        if (settled) return;
        settled = true;
        newState.wizardCompletionInProgress = false;
        if (_.isFunction(action.settleCompletion)) action.settleCompletion(newState);
    };
    const timeoutId = setTimeout(() => {
        General.logError(errorContext, 'wizard completion timed out; releasing in-progress lock');
        settle();
    }, WIZARD_COMPLETION_TIMEOUT_MS);
    Promise.resolve(runner())
        .catch(e => General.logError(errorContext, e))
        .finally(() => {
            clearTimeout(timeoutId);
            settle();
        });
    return newState;
}

export function dispatchHandleNext(state, action, context, errorContext) {
    if (state.wizard.isLastPage()) {
        if (state.wizardCompletionInProgress) return state;
        return runWizardCompletion(state, action, () => state.handleNextAsync(action, context), errorContext);
    }
    state.handleNext(action, context);
    return state;
}
