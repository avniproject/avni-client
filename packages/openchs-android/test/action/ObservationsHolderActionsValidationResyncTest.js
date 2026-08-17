// Targeted validation re-sync on async inference/media writes: only the written element+row is
// re-synced from fresh statuses; other elements/rows stay untouched. Spy-on-static-helpers
// pattern per ObservationsHolderActionsInferenceBatchTest.js.
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
        handleValidationResults: AbstractDataEntryState.prototype.handleValidationResults,
    };
    return {formElementGroup: {}, observationsHolder: {}, clone: () => newState, _newState: newState};
};

// Minimal context satisfying handleValidationResults' SettingsService lookup.
const ctx = (devSkipValidation = false) => ({get: () => ({getSettings: () => ({devSkipValidation})})});

const freshStatus = (uuid, questionGroupIndex, validationErrors) => ({uuid, questionGroupIndex, validationErrors});

describe('ObservationsHolderActions targeted validation re-sync', () => {
    afterEach(() => jest.restoreAllMocks());

    it('clears the written row\'s stale Rule error when the fresh status has no errors', () => {
        const state = makeState([ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Suspicious'}]}, ctx());
        expect(state._newState.validationResults).toHaveLength(0);
    });

    it('keeps a failure when the fresh status still has errors for the written row', () => {
        const state = makeState([ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, ['aiVerdictPending'])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, ctx());
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
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, ctx());
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
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, ctx());
        expect(state._newState.validationResults).toEqual([mandatoryVR]);
    });

    it('is null-safe when the state lacks the validation API (defensive only — all registered flows have it)', () => {
        const bare = {formElementGroup: {}, observationsHolder: {}};
        const state = {formElementGroup: {}, observationsHolder: {}, clone: () => bare, _newState: bare};
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        expect(() => ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, ctx()))
            .not.toThrow();
    });

    it('respects devSkipValidation — no validation mutation when the dev setting is on', () => {
        const stale = ruleVR('fe-verdict', 1, 'aiVerdictPending');
        const state = makeState([stale]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'X'}]}, ctx(true));
        expect(state._newState.validationResults).toEqual([stale]);
    });

    it('clears a stale mandatory (Form-type) failure for the written row when its value lands', () => {
        // Worker tapped Next while the verdict was pending → "no value specified" stored; the
        // async write must clear it without any navigation.
        const mandatoryFailure = new ValidationResult(false, 'fe-verdict', 'emptyValidationMessage', null, 1);
        const state = makeState([mandatoryFailure]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [{questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Non-Suspicious'}]}, ctx());
        expect(state._newState.validationResults).toHaveLength(0);
    });

    it('re-syncs a same-row [clear, verdict] batch exactly once — one gate log, not two', () => {
        const logSpy = jest.spyOn(General, 'logDebug').mockImplementation(() => {});
        const state = makeState([ruleVR('fe-verdict', 1, 'aiVerdictPending')]);
        jest.spyOn(ObservationsHolderActions, '_applyInferenceWrite')
            .mockReturnValue({uuid: 'fe-verdict', questionGroupIndex: 1});
        jest.spyOn(ObservationsHolderActions, '_getFormElementStatuses')
            .mockReturnValue([freshStatus('fe-verdict', 1, [])]);
        ObservationsHolderActions.onObservationWriteBatch(state,
            {results: [
                {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: null, clear: true},
                {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 1, value: 'Non-Suspicious'},
            ]}, ctx());
        const gateLogs = logSpy.mock.calls.map(c => String(c[1])).filter(m => m.startsWith('resync gate'));
        expect(gateLogs).toHaveLength(1);
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
            ]}, ctx());
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
            {questionGroupConceptName: 'G', conceptName: 'V', questionGroupIndex: 0, value: 'Suspicious'}, ctx());
        expect(state._newState.validationResults).toHaveLength(0);
    });
});
