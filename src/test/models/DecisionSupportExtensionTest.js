import {expect} from 'chai';
import DecisionSupportExtension from "../../js/models/DecisionSupportExtension";

describe('Decision Support Extension', () => {
    it('Module Name', () => {
        expect(new DecisionSupportExtension("Stroke Screening").functionName).to.equal("Stroke_Screening_getDecision");
        expect(new DecisionSupportExtension("StrokeScreening").functionName).to.equal("StrokeScreening_getDecision");
    });
});