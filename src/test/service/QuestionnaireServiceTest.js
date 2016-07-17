import QuestionnaireService from '../../js/service/QuestionnaireService';
import { expect } from 'chai';

describe('Questionnaire Service', () => {
    it('getQuestionnaire', () => {
        var questionnaireService = new QuestionnaireService(null, null, null);
        expect(questionnaireService.getQuestionnaire("Sample")).to.not.be.undefined;
        expect(questionnaireService.getQuestionnaire("non-existent")).to.be.undefined;
        expect(questionnaireService.getQuestionnaire("Diabetes")).to.not.be.undefined;
    });
});