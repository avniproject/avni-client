import {expect} from 'chai';
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

    it("isAbnormal shows abnormal when ranges provided", () => {
       const concept = createConcept(10, 20, 5, 50);
       expect(concept.isAbnormal(4)).to.be.true;
       expect(concept.isAbnormal(5)).to.be.false;
       expect(concept.isAbnormal(6)).to.be.false;
       expect(concept.isAbnormal(49)).to.be.false;
       expect(concept.isAbnormal(50)).to.be.false;
       expect(concept.isAbnormal(51)).to.be.true;
    });

    it("isAbnormal shows abnormal when ranges partially provided", () => {
        let concept;
        concept = createConcept(10, 20, null, 50);
        expect(concept.isAbnormal(4)).to.be.false;
        expect(concept.isAbnormal(5)).to.be.false;
        expect(concept.isAbnormal(6)).to.be.false;
        expect(concept.isAbnormal(49)).to.be.false;
        expect(concept.isAbnormal(50)).to.be.false;
        expect(concept.isAbnormal(51)).to.be.true;

        concept = createConcept(10, 20, 5, null);
        expect(concept.isAbnormal(4)).to.be.true;
        expect(concept.isAbnormal(5)).to.be.false;
        expect(concept.isAbnormal(6)).to.be.false;
        expect(concept.isAbnormal(49)).to.be.false;
        expect(concept.isAbnormal(50)).to.be.false;
        expect(concept.isAbnormal(51)).to.be.false;
    });

});