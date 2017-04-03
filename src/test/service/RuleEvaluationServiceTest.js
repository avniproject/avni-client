import {expect} from "chai";
import RuleEvaluationService from "../../js/service/RuleEvaluationService";
import Encounter from "../../js/models/Encounter";
import TestContext from "../views/testframework/TestContext";
import Observation from "../../js/models/Observation";
import Concept from "../../js/models/Concept";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";
import EntityFactory from "../models/EntityFactory";

describe('RuleEvaluationServiceTest', () => {
    it('getEncounterDecision', () => {
        const ruleEvaluationService = new RuleEvaluationService({}, new TestContext());
        ruleEvaluationService.init();
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(EntityFactory.createConcept("foo", Concept.dataType.Numeric), new PrimitiveValue(2)));
        const encounterDecision = ruleEvaluationService.getDecision(encounter);
        expect(encounterDecision).is.equal(2, encounterDecision);
    });
});