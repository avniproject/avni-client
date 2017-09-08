import {expect} from "chai";
import ConceptService from "../../js/service/ConceptService";
import Concept from "../../js/models/Concept";
import EntityFactory from "../models/EntityFactory";
import _ from "lodash";

function findObsForConcept(observations, conceptName) {
    return _.find(observations, (observation) => observation.concept.name === conceptName)
}

describe('ConceptServiceTest', () => {
    it('addDecisions', () => {
        const concepts = {
            "c1": EntityFactory.createConcept("c1", Concept.dataType.Text, '7291f903-c574-4a2b-93f0-bbea9e6dd7ce'),
            "c2": EntityFactory.createConcept("c2", Concept.dataType.Text, 'f957798a-1dd9-41d6-85cd-2a5e394467ce'),
            "c3": EntityFactory.createConcept("c3", Concept.dataType.Coded, 'cb89d4e5-04ff-401e-97b9-d66ef6f89162'),
            "a1": EntityFactory.createConcept("a1", Concept.dataType.NA, 'd671335e-a6b2-44b5-a759-ce5e3a6777be'),
            "a2": EntityFactory.createConcept("a2", Concept.dataType.NA, 'ff315fcf-0316-424c-a0b9-9ee494d65ae0'),
            "a3": EntityFactory.createConcept("a3", Concept.dataType.NA, '21472f5f-28a6-4051-9228-a0b0cf3a8d19')
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
        expect(findObsForConcept(observations, "c3").valueJSON.answer).to.be.an('array').with.lengthOf(2);
        expect(observations[1].getValueWrapper().getValue().length).is.equal(2);

        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', ['a3'])]);
        expect(observations.length).is.equal(2);
        expect(findObsForConcept(observations, "c3").valueJSON.answer).to.be.an('array').with.lengthOf(1);

        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', [])]);
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