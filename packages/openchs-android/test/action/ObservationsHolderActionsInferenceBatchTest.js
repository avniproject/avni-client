/**
 * Focused unit tests for ObservationsHolderActions.onObservationWriteBatch — the handler for
 * EDGE_MODEL.INFERENCE_RESULTS_BATCH. The invariant that matters for performance: a burst of N
 * inference results applies N writes but re-evaluates the form exactly ONCE (not N times).
 * The actual obs-write internals are exercised by the integration tests; here we spy on the
 * static helpers so we can assert the apply-all-then-reeval-once shape without a real state.
 */
import ObservationsHolderActions from "../../src/action/common/ObservationsHolderActions";

describe('ObservationsHolderActions.onObservationWriteBatch', () => {
    const makeState = () => {
        const newState = {formElementGroup: {}, observationsHolder: {}};
        return {
            formElementGroup: {},
            observationsHolder: {},
            clone: jest.fn(() => newState),
            _newState: newState,
        };
    };

    afterEach(() => jest.restoreAllMocks());

    it('applies every result once and re-evaluates the form exactly once', () => {
        const state = makeState();
        const applySpy = jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite').mockReturnValue(true);
        const reevalSpy = jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses').mockImplementation(() => {});

        const results = [
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 0, value: 'Suspicious'},
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Non-Suspicious'},
            {conceptName: 'Top', value: 'X'},
        ];
        const result = ObservationsHolderActions.onObservationWriteBatch(state, {results}, {});

        expect(applySpy).toHaveBeenCalledTimes(3);
        // each write targets the cloned state and carries its own result
        expect(applySpy.mock.calls.map(c => c[0])).toEqual([state._newState, state._newState, state._newState]);
        expect(applySpy.mock.calls.map(c => c[1])).toEqual(results);
        expect(reevalSpy).toHaveBeenCalledTimes(1);   // ONE re-eval for the whole batch
        expect(result).toBe(state._newState);
    });

    it('returns the original state and does not re-evaluate when results is empty', () => {
        const state = makeState();
        const reevalSpy = jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses').mockImplementation(() => {});
        expect(ObservationsHolderActions.onObservationWriteBatch(state, {results: []}, {})).toBe(state);
        expect(reevalSpy).not.toHaveBeenCalled();
        expect(state.clone).not.toHaveBeenCalled();
    });

    it('returns the original state and does not re-evaluate when no result applies (all off-page)', () => {
        const state = makeState();
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite').mockReturnValue(false);
        const reevalSpy = jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses').mockImplementation(() => {});
        const result = ObservationsHolderActions.onObservationWriteBatch(state, {results: [{conceptName: 'X', value: 'Y'}]}, {});
        expect(reevalSpy).not.toHaveBeenCalled();
        expect(result).toBe(state);
    });

    it('bails when no form is open (no formElementGroup)', () => {
        const reevalSpy = jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses').mockImplementation(() => {});
        const state = {observationsHolder: {}};
        expect(ObservationsHolderActions.onObservationWriteBatch(state, {results: [{conceptName: 'X', value: 'Y'}]}, {})).toBe(state);
        expect(reevalSpy).not.toHaveBeenCalled();
    });
});
