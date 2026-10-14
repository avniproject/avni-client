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
        const applySpy = jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-x', questionGroupIndex: null});
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
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite').mockReturnValue(null);
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

describe('_applyInferenceWrite clear/invalidation path (#2010)', () => {
    it('a top-level clear write blanks the obs without writing a value and returns the target', () => {
        const removeSpy = jest.fn();
        const formElement = {uuid: 'fe-verdict', concept: {name: 'V', isCodedConcept: () => true}};
        const newState = {
            formElementGroup: {getFormElements: () => [formElement]},
            observationsHolder: {_removeExistingObs: removeSpy, addOrUpdateCodedObs: jest.fn(), addOrUpdatePrimitiveObs: jest.fn()},
        };
        const target = ObservationsHolderActions._applyInferenceWrite(newState, {conceptName: 'V', value: null, clear: true});
        expect(removeSpy).toHaveBeenCalledWith(formElement.concept);
        expect(newState.observationsHolder.addOrUpdateCodedObs).not.toHaveBeenCalled();
        expect(newState.observationsHolder.addOrUpdatePrimitiveObs).not.toHaveBeenCalled();
        expect(target).toEqual({uuid: 'fe-verdict', questionGroupIndex: null});
    });

    it('an RQG clear write removes the row child obs without writing and returns the target', () => {
        const removeSpy = jest.fn();
        const parentFE = {concept: {name: 'G'}, isRepeatableQuestionGroup: () => true};
        const childFE = {
            uuid: 'fe-child', concept: {name: 'V', isCodedConcept: () => true, isMediaConcept: () => false},
            isQuestionGroup: () => true, getParentFormElement: () => parentFE,
        };
        const rqg = {size: () => 2, getGroupObservationAtIndex: () => ({removeExistingObs: removeSpy})};
        const newState = {
            formElementGroup: {getFormElements: () => [childFE]},
            observationsHolder: {getObservation: () => ({getValueWrapper: () => rqg}), updateRepeatableGroupQuestion: jest.fn()},
        };
        const target = ObservationsHolderActions._applyInferenceWrite(newState,
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: null, clear: true});
        expect(removeSpy).toHaveBeenCalledWith(childFE.concept);
        expect(newState.observationsHolder.updateRepeatableGroupQuestion).not.toHaveBeenCalled();
        expect(target).toEqual({uuid: 'fe-child', questionGroupIndex: 1});
    });
});

describe('_applyInferenceWrite return contract (#2009)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('top-level write returns {uuid, questionGroupIndex: null}', () => {
        const fe = {uuid: 'fe-top', concept: {name: 'Top', isCodedConcept: () => false}};
        const newState = {
            formElementGroup: {getFormElements: () => [fe]},
            observationsHolder: {addOrUpdatePrimitiveObs: jest.fn()},
        };
        const target = ObservationsHolderActions._applyInferenceWrite(newState, {conceptName: 'Top', value: 'X'});
        expect(target).toEqual({uuid: 'fe-top', questionGroupIndex: null});
    });

    it('top-level write returns null when the concept is not on the page', () => {
        const newState = {formElementGroup: {getFormElements: () => []}, observationsHolder: {}};
        expect(ObservationsHolderActions._applyInferenceWrite(newState, {conceptName: 'Missing', value: 'X'})).toBeNull();
    });

    it('RQG write returns {uuid: child uuid, questionGroupIndex: row}', () => {
        const parentFE = {concept: {name: 'G'}, isRepeatableQuestionGroup: () => true};
        const childFE = {
            uuid: 'fe-child', concept: {name: 'V', isCodedConcept: () => false, isMediaConcept: () => false},
            isQuestionGroup: () => true, getParentFormElement: () => parentFE,
        };
        const rqg = {size: () => 2, getGroupObservationAtIndex: () => ({removeExistingObs: jest.fn()})};
        const newState = {
            formElementGroup: {getFormElements: () => [childFE]},
            observationsHolder: {
                getObservation: () => ({getValueWrapper: () => rqg}),
                updateRepeatableGroupQuestion: jest.fn(),
            },
        };
        const target = ObservationsHolderActions._applyInferenceWrite(newState,
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Suspicious'});
        expect(target).toEqual({uuid: 'fe-child', questionGroupIndex: 1});
    });

    it('RQG write returns null when the row does not exist', () => {
        const parentFE = {concept: {name: 'G'}, isRepeatableQuestionGroup: () => true};
        const childFE = {
            uuid: 'fe-child', concept: {name: 'V', isCodedConcept: () => false, isMediaConcept: () => false},
            isQuestionGroup: () => true, getParentFormElement: () => parentFE,
        };
        const rqg = {size: () => 1, getGroupObservationAtIndex: () => ({removeExistingObs: jest.fn()})};
        const newState = {
            formElementGroup: {getFormElements: () => [childFE]},
            observationsHolder: {getObservation: () => ({getValueWrapper: () => rqg})},
        };
        expect(ObservationsHolderActions._applyInferenceWrite(newState,
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 5, value: 'S'})).toBeNull();
    });
});
