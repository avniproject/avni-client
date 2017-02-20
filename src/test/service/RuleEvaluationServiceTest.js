import {expect} from 'chai';
import _ from "lodash";
import RuleEvaluationService from "../../js/service/RuleEvaluationService";
import Encounter from "../../js/models/Encounter";
import TestContext from "../views/testframework/TestContext";
import Observation from "../../js/models/Observation";
import Concept from "../../js/models/Concept";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";

describe('RuleEvaluationServiceTest', () => {
    it('getEncounterDecision', () => {
        const ruleEvaluationService = new RuleEvaluationService({}, new TestContext());
        ruleEvaluationService.init();
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(Concept.create("foo", Concept.dataType.Numeric), new PrimitiveValue(2)));
        const encounterDecision = ruleEvaluationService.getEncounterDecision(encounter);
        expect(encounterDecision).is.equal(2, encounterDecision);
    });
});