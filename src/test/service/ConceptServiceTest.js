import {expect} from 'chai';
import _ from "lodash";
import ConceptService from "../../js/service/ConceptService";
import Concept from '../../js/models/Concept';
import EntityFactory from "../models/EntityFactory";

describe('ConceptServiceTest', () => {
    it('addDecisions', () => {
        const concepts = {
            "c1": EntityFactory.createConcept("c1", Concept.dataType.Text),
            "c2": EntityFactory.createConcept("c2", Concept.dataType.Text)
        };
        const testConceptService = new TestConceptService(null, null, concepts);
        const observations = [EntityFactory.createObservation(concepts['c1'])];
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', 'foo')]);
        expect(observations.length).is.equal(2);
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', 'foo')]);
        expect(observations.length).is.equal(2);
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', null)]);
        expect(observations.length).is.equal(1);
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