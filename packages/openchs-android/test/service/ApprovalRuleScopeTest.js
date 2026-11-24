import {assert} from 'chai';
import {RuleCondition} from 'rules-config';
import {Concept, EntityApprovalStatus, Observation, SingleCodedValue} from 'avni-models';

/**
 * The client has to be able to RUN the declarative rules App Designer writes for Approval and Rejection
 * forms (avniproject/rules-config#41).
 *
 * Two repos hold the two halves and they are pinned independently. avni-webapp generates the rule text;
 * this app evaluates it. When only the webapp's pin moved, the App Designer emitted
 * `valueInEntityApprovalStatus(...)` and this app's older bundle had no such method - so every Show/Hide
 * rule on a decision form threw, RuleEvaluationService#runFormElementStatusRule swallowed the throw and
 * returned null, the null was filtered out, and the question kept its default visibility.
 *
 * That failure is invisible: no crash, no toast, nothing in the UI. It reads as "skip logic does not
 * work". The only signal is a Rule-FE line in logcat. So the pin is asserted here rather than left to be
 * found on a device.
 */
describe('Approval form rule support in the pinned rules-config', () => {

    it('exposes the approval scope the generated rules call', () => {
        assert.isFunction(RuleCondition.prototype.valueInEntityApprovalStatus,
            'rules-config pin is behind: App Designer generates valueInEntityApprovalStatus(...) and this ' +
            'bundle cannot run it, so every Show/Hide rule on a decision form silently does nothing');
    });

    it('evaluates a coded Show/Hide rule the way App Designer generates it', () => {
        const male = Concept.create('Male', Concept.dataType.NA);
        male.uuid = 'male-uuid';
        const female = Concept.create('Female', Concept.dataType.NA);
        female.uuid = 'female-uuid';
        const question = Concept.create('Test', Concept.dataType.Coded);
        question.uuid = 'test-uuid';
        question.answers = [];
        question.addAnswer(male);
        question.addAnswer(female);

        const visibilityWhenAnswerIs = (answerUuid) => {
            const decision = new EntityApprovalStatus();
            decision.uuid = 'eas-1';
            decision.observations = [Observation.create(question, new SingleCodedValue(answerUuid))];
            return new RuleCondition({entityApprovalStatus: decision, formElement: {uuid: 'fe-1'}})
                .when.valueInEntityApprovalStatus('test-uuid')
                .containsAnswerConceptName('male-uuid')
                .matches();
        };

        assert.isTrue(visibilityWhenAnswerIs('male-uuid'), 'the answer the rule names must match');
        assert.isFalse(visibilityWhenAnswerIs('female-uuid'), 'any other answer must not match');
    });

    /**
     * findObservation is what the approval scope reaches for. It arrived with the observations field in
     * avni-models#71, so a models pin behind that one breaks the same rules by the other half.
     */
    it('reads answers off the decision, which needs the models pin too', () => {
        assert.isFunction(new EntityApprovalStatus().findObservation,
            'openchs-models pin is behind avni-models#71');
    });
});
