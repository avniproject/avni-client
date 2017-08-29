import {expect} from "chai";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";
import {Encounter, Observation, Concept, PrimitiveValue} from "openchs-models";
import TestContext from "../views/testframework/TestContext";
import EntityFactory from "openchs-models/test/EntityFactory";

describe('RuleEvaluationServiceTest', () => {
    it('getEncounterDecision', () => {
        const ruleEvaluationService = new RuleEvaluationService({}, new TestContext());
        ruleEvaluationService.init();
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(EntityFactory.createConcept("foo", Concept.dataType.Numeric), new PrimitiveValue(2)));
        const decisions = ruleEvaluationService.getDecisions(encounter, 'Encounter');
        expect(decisions).to.have.keys('registrationDecisions', 'enrolmentDecisions', 'encounterDecisions');
    });
});