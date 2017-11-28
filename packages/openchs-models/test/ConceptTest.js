import {assert} from 'chai';
import Concept from "../src/Concept";

describe('ConceptTest', () => {
    let createConcept = function (lowAbsolute, hiAbsolute, lowNormal, hiNormal) {
        const concept = new Concept();
        concept.lowAbsolute = lowAbsolute;
        concept.hiAbsolute = hiAbsolute;
        concept.lowNormal = lowNormal;
        concept.hiNormal = hiNormal;
        return concept;
    };

    it('violatesRange for concept with range', () => {
        const concept = createConcept(10, 65);
        assert.isFalse(concept.violatesRange("a"));
        assert.isFalse(concept.violatesRange(20));
        assert.isFalse(concept.violatesRange(10));
        assert.isFalse(concept.violatesRange(65));
        assert.isTrue(concept.violatesRange(5));
        assert.isTrue(concept.violatesRange(66));
    });

    it('violatesRange for concept without range', () => {
        const concept = new Concept();
        assert.isFalse(concept.violatesRange(20));
        assert.isFalse(concept.violatesRange());
        assert.isFalse(concept.violatesRange(null));
        assert.isFalse(concept.violatesRange("1"));
    });

    it("isAbnormal shows abnormal when ranges provided", () => {
       const concept = createConcept(10, 20, 5, 50);
       assert.isTrue(concept.isAbnormal(4));
       assert.isFalse(concept.isAbnormal(5));
       assert.isFalse(concept.isAbnormal(6));
       assert.isFalse(concept.isAbnormal(49));
       assert.isFalse(concept.isAbnormal(50));
       assert.isTrue(concept.isAbnormal(51));
    });

    it("isAbnormal shows abnormal when ranges partially provided", () => {
        let concept;
        concept = createConcept(10, 20, null, 50);
        assert.isFalse(concept.isAbnormal(4));
        assert.isFalse(concept.isAbnormal(5));
        assert.isFalse(concept.isAbnormal(6));
        assert.isFalse(concept.isAbnormal(49));
        assert.isFalse(concept.isAbnormal(50));
        assert.isTrue(concept.isAbnormal(51));

        concept = createConcept(10, 20, 5, null);
        assert.isTrue(concept.isAbnormal(4));
        assert.isFalse(concept.isAbnormal(5));
        assert.isFalse(concept.isAbnormal(6));
        assert.isFalse(concept.isAbnormal(49));
        assert.isFalse(concept.isAbnormal(50));
        assert.isFalse(concept.isAbnormal(51));
    });

});