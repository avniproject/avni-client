import {expect} from "chai";
import ConceptService from "../../../src/service/ConceptService";
import {Concept} from "openchs-models";
import EntityFactory from "openchs-models/test/EntityFactory";

describe('ConceptServiceTest', () => {
    it('addDecisions', () => {
        const concepts = {
            "c1": EntityFactory.createConcept("c1", Concept.dataType.Text),
            "c2": EntityFactory.createConcept("c2", Concept.dataType.Text),
            "c3": EntityFactory.createConcept("c3", Concept.dataType.Coded),
            "a1": EntityFactory.createConcept("a1", Concept.dataType.NA),
            "a2": EntityFactory.createConcept("a2", Concept.dataType.NA)
        };
        const testConceptService = new TestConceptService(null, null, concepts);
        const observations = [EntityFactory.createObservation(concepts['c1'])];
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', 'foo')]);
        expect(observations.length).is.equal(2);
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', 'foo')]);
        expect(observations.length).is.equal(2);
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', null)]);
        expect(observations.length).is.equal(1);
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', [])]);
        expect(observations.length).is.equal(1);
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', ['a1', 'a2'])]);
        expect(observations.length).is.equal(2);
        expect(observations[1].getValueWrapper().getValue().length).is.equal(2);
    });
});

class TestConceptService extends ConceptService {
    constructor(db, beanStore, concepts) {
        super(db, beanStore);
        this.concepts = concepts;
    }

    findConcept(name) {
        return this.concepts[name];
    }
}