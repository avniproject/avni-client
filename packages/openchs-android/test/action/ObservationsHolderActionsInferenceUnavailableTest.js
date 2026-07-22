/**
 * Unit tests for ObservationsHolderActions.onInferenceUnavailable — the handler for
 * EDGE_MODEL.INFERENCE_UNAVAILABLE. When an image produces no verdict (inference failed at
 * runtime), this raises an Inference-typed ValidationResult on the image form element so Next is
 * blocked and the error renders red. The result must survive rule cycles (unlike a Form/Rule-typed
 * one) and be resolved from the scheduling rule's concept name. It is cleared by the #2009 re-sync
 * when a verdict later lands.
 */
import {ValidationResult} from 'openchs-models';
import ObservationsHolderActions from "../../src/action/common/ObservationsHolderActions";

describe('ObservationsHolderActions.onInferenceUnavailable', () => {
    const fe = (uuid, conceptName, extra = {}) => ({
        uuid,
        concept: {name: conceptName},
        isQuestionGroup: () => false,
        getParentFormElement: () => null,
        ...extra,
    });

    const makeState = (formElements) => {
        const cloned = {
            validationResults: [],
            handleValidationResult(vr) {
                this.validationResults = this.validationResults.filter(e => e.formIdentifier !== vr.formIdentifier);
                if (!vr.success) this.validationResults.push(vr);
            },
        };
        return {
            formElementGroup: {getFormElements: () => formElements},
            validationResults: [],
            clone: jest.fn(() => cloned),
            _cloned: cloned,
        };
    };

    it('raises an Inference-typed validation error on the target element and blocks (returns cloned state)', () => {
        const state = makeState([fe('uuid-ai', 'AI Verdict')]);
        const result = ObservationsHolderActions.onInferenceUnavailable(state, {
            conceptName: 'AI Verdict', questionGroupConceptName: null, questionGroupIndex: null,
            messageKey: 'aiInferenceFailed',
        }, {});

        expect(result).toBe(state._cloned);
        expect(result.validationResults).toHaveLength(1);
        const vr = result.validationResults[0];
        expect(vr.success).toBe(false);
        expect(vr.formIdentifier).toBe('uuid-ai');
        expect(vr.messageKey).toBe('aiInferenceFailed');
        expect(vr.validationType).toBe(ValidationResult.ValidationTypes.Inference);
    });

    it('resolves an RQG child element by concept name + parent group', () => {
        const child = fe('uuid-child', 'AI Verdict', {
            isQuestionGroup: () => true,
            getParentFormElement: () => ({concept: {name: 'Image-wise AI Assessment'}}),
        });
        const state = makeState([child]);
        const result = ObservationsHolderActions.onInferenceUnavailable(state, {
            conceptName: 'AI Verdict', questionGroupConceptName: 'Image-wise AI Assessment',
            questionGroupIndex: 0, messageKey: 'aiInferenceFailed',
        }, {});

        expect(result.validationResults[0].formIdentifier).toBe('uuid-child');
        expect(result.validationResults[0].questionGroupIndex).toBe(0);
    });

    it('is a no-op when the target concept is not on the current page', () => {
        const state = makeState([fe('uuid-other', 'Something Else')]);
        const result = ObservationsHolderActions.onInferenceUnavailable(state, {
            conceptName: 'AI Verdict', questionGroupConceptName: null, questionGroupIndex: null,
            messageKey: 'aiInferenceFailed',
        }, {});
        expect(result).toBe(state);
    });

    it('bails when no form is open (no formElementGroup)', () => {
        const state = {validationResults: []};
        expect(ObservationsHolderActions.onInferenceUnavailable(state, {conceptName: 'AI Verdict'}, {})).toBe(state);
    });
});
