/**
 * #2009 — after an async inference/media write lands, ONLY the written element+row's Rule-type
 * validation result is re-synced from the fresh statuses. Mandatory/other-element/other-row
 * errors are untouchable by construction. Spy-on-static-helpers pattern per
 * ObservationsHolderActionsInferenceBatchTest.js; handleValidationResult is the REAL
 * AbstractDataEntryState implementation borrowed onto a plain state object.
 */
import ObservationsHolderActions from "../../src/action/common/ObservationsHolderActions";
import AbstractDataEntryState from "../../src/state/AbstractDataEntryState";
import {ValidationResult} from "avni-models";
import General from "../../src/utility/General";

const ruleVR = (uuid, qgIdx, message) =>
    new ValidationResult(false, uuid, message, null, qgIdx, ValidationResult.ValidationTypes.Rule);

const makeState = (validationResults) => {
    const newState = {
        formElementGroup: {},
        observationsHolder: {},
        validationResults,
        handleValidationResult: AbstractDataEntryState.prototype.handleValidationResult,
    };
    return {formElementGroup: {}, observationsHolder: {}, clone: () => newState, _newState: newState};
};

const freshStatus = (uuid, questionGroupIndex, validationErrors) => ({uuid, questionGroupIndex, validationErrors});

describe('ObservationsHolderActions targeted validation re-sync (#2009)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('clears the written row\'s stale Rule error when the fresh status has no errors', () => {
        const state = makeState([ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Suspicious'}]}, {});
        expect(state._newState.validationResults).toHaveLength(0);
    });

    it('keeps a failure when the fresh status still has errors for the written row', () => {
        const state = makeState([ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, ['aiVerdictPending'])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, {});
        expect(state._newState.validationResults).toHaveLength(1);
        expect(state._newState.validationResults[0].success).toBe(false);
    });

    it('does not touch another row of the same element', () => {
        const state = makeState([ruleVR('fe-verdict', 0, 'aiVerdictPending'), ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 0, ['aiVerdictPending']), freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, {});
        expect(state._newState.validationResults).toHaveLength(1);
        expect(state._newState.validationResults[0].questionGroupIndex).toBe(0);
    });

    it('never touches non-Rule (e.g. mandatory) errors on other elements', () => {
        const mandatoryVR = new ValidationResult(false, 'fe-mandatory', 'emptyValidationMessage');
        const state = makeState([mandatoryVR, ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, {});
        expect(state._newState.validationResults).toEqual([mandatoryVR]);
    });

    it('is null-safe when the state has no handleValidationResult (e.g. Task flows)', () => {
        const bare = {formElementGroup: {}, observationsHolder: {}};
        const state = {formElementGroup: {}, observationsHolder: {}, clone: () => bare, _newState: bare};
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        expect(() => ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, {}))
            .not.toThrow();
    });

    it('clears a stale mandatory (Form-type) failure for the written row when its value lands', () => {
        // Field scenario (20 Jul): AI Verdict is a MANDATORY element; worker taps Next while the
        // verdict is pending → "There is no value specified" stored (Form-type). The verdict then
        // lands via the async write — the stale text must clear without any navigation.
        const mandatoryFailure = new ValidationResult(false, 'fe-verdict', 'emptyValidationMessage', null, 1);
        const state = makeState([mandatoryFailure]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Non-Suspicious'}]}, {});
        expect(state._newState.validationResults).toHaveLength(0);
    });

    it('logs the gate state per written row (cleared vs kept) for later log analysis', () => {
        const logSpy = jest.spyOn(General, 'logDebug').mockImplementation(() => {});
        const state = makeState([ruleVR('fe-verdict', 0, 'aiVerdictPending'), ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValueOnce({uuid: 'fe-verdict', questionGroupIndex: 0})
            .mockReturnValueOnce({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 0, []), freshStatus('fe-verdict', 1, ['aiVerdictPending'])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [
                {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 0, value: 'X'},
                {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Y'},
            ]}, {});
        const gateLogs = logSpy.mock.calls.map(c => String(c[1])).filter(m => m.startsWith('resync gate'));
        expect(gateLogs).toEqual([
            'resync gate CLEARED: fe-verdict[0]',
            'resync gate KEPT: fe-verdict[1] error=aiVerdictPending',
        ]);
    });

    it('onInferenceResultAvailable (single result) re-syncs the same way', () => {
        const state = makeState([ruleVR('fe-verdict', 0, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 0});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 0, [])]);
        ObservationsHolderActions.onInferenceResultAvailable(state,
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 0, value: 'Suspicious'}, {});
        expect(state._newState.validationResults).toHaveLength(0);
    });
});
