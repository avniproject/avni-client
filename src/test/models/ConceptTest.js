import {expect} from 'chai';
import _ from "lodash";
import Concept from "../../js/models/Concept";

describe('ConceptTest', () => {
    let createConcept = function (lowAbsolute, hiAbsolute) {
        const concept = new Concept();
        concept.lowAbsolute = lowAbsolute;
        concept.hiAbsolute = hiAbsolute;
        return concept;
    };

    it('violatesRange for concept with range', () => {
        const concept = createConcept(10, 65);
        expect(concept.violatesRange("a")).is.false;
        expect(concept.violatesRange(20)).is.false;
        expect(concept.violatesRange(10)).is.false;
        expect(concept.violatesRange(65)).is.false;
        expect(concept.violatesRange(5)).is.true;
        expect(concept.violatesRange(66)).is.true;
    });

    it('violatesRange for concept without range', () => {
        const concept = new Concept();
        expect(concept.violatesRange(20)).is.false;
        expect(concept.violatesRange()).is.false;
        expect(concept.violatesRange(null)).is.false;
        expect(concept.violatesRange("1")).is.false;
    });

});