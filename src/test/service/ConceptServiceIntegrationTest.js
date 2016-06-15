import {expect} from 'chai';
import ConceptService from "../../js/service/ConceptService";

xdescribe('Concept Service Integration', () => {
    var concepts;

    beforeEach(done => {
        var conceptService = new ConceptService();

        setTimeout(() => {
            concepts = conceptService.getConcepts();
            done();
        }, 1000);
    });

    it('getConcepts', () => {
        console.log(concepts);
        expect(concepts).to.not.be.undefined;
        expect(concepts.length).to.equal(2);
    });
});