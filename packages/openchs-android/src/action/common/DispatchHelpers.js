/**
 * Last-page wizard transitions can run async decision rules (e.g. edge-model inference)
 * via params.services.edgeModelService. Reducers must remain synchronous, so the async
 * path is fired in the background and the new state is signalled later via action.completed.
 */
export function dispatchHandleNext(state, action, context, errorContext) {
    if (state.wizard.isLastPage()) {
        state.handleNextAsync(action, context).catch(e =>
            console.error(`${errorContext} async error`, e)
        );
    } else {
        state.handleNext(action, context);
    }
    return state;
}
