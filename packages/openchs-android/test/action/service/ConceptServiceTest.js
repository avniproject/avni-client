import {expect} from "chai";
import _ from "lodash";
import ConceptService from "../../../src/service/ConceptService";
import {Concept} from 'avni-models';
import EntityFactory from "../../EntityFactory";

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
            "a3": EntityFactory.createConcept("a3", Concept.dataType.NA, '21472f5f-28a6-4051-9228-a0b0cf3a8d19'),
            "a4": EntityFactory.createConcept("a4", Concept.dataType.Numeric, 'ae157302-b4f7-4a55-994a-e543c64eb33e'),
        };
        const testConceptService = new TestConceptService(concepts);
        const observations = [EntityFactory.createObservation(concepts['c1'])];

        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', 'foo')]);
        expect(observations.length).is.equal(2);

        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', 'foo')]);
        expect(observations.length).is.equal(2);

        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c2', null)]);
        expect(observations.length).is.equal(1);

        //add empty answer for a single select question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', null)]);
        expect(observations.length).is.equal(1);

        //add wrong answer for a single select question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', 'wrong answer')]);
        expect(observations.length).is.equal(1);

        //add answer for a single select question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', 'a1')]);
        expect(observations.length).is.equal(2);

        //add empty answer for a multiselect question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', [])]);
        expect(observations.length).is.equal(1);

        //add options for a multi-select question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', ['a1', 'a2'])]);
        expect(observations.length).is.equal(2);
        expect(findObsForConcept(observations, "c3").valueJSON.answer).to.be.an('array').with.lengthOf(2);
        expect(observations[1].getValueWrapper().getValue().length).is.equal(2);

        //change options for a multi-select question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', ['a3'])]);
        expect(observations.length).is.equal(2);
        expect(findObsForConcept(observations, "c3").valueJSON.answer).to.be.an('array').with.lengthOf(1);

        //remove answers of a multi-select question
        testConceptService.addDecisions(observations, [EntityFactory.createDecision('c3', [])]);
        expect(observations.length).is.equal(1);

        //add numeric value
        testConceptService.addDecisions(observations, [EntityFactory.createDecision("a4", 1)]);
        expect(observations.length).is.equal(2);

        //change value of numeric value
        testConceptService.addDecisions(observations, [EntityFactory.createDecision("a4", 2)]);
        expect(observations.length).is.equal(2);

        //remove numeric value
        testConceptService.addDecisions(observations, [EntityFactory.createDecision("a4", null)]);
        expect(observations.length).is.equal(1);
    });
});

class TestConceptService extends ConceptService {
    constructor(concepts) {
        super(null, null);
        this.concepts = concepts;
    }

    findConcept(name) {
        return this.concepts[name];
    }
}
