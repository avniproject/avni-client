import {expect} from 'chai';
import ExportService from "../../js/service/ExportService";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import DecisionSupportSession from "../../js/models/DecisionSupportSession";

describe('Export Service', () => {
    it('Export', () => {
        const stubbedFileSystemGateway = {};

        const stubbedDecisionSupportSessionService = {
            getAll: (questionnaireName) => {
                return {
                    filter: (criteria) => {
                        return [
                            DecisionSupportSession.newInstance("foo", [{value: 'Paracetamol'}],
                                                                    [new QuestionAnswer("Question 1", "Answer 1"), new QuestionAnswer("Question 2", "Answer 2")])
                        ]
                    }
                }
            }
        };

        const stubbedQuestionnaireService = {
            getQuestionnaire: (questionnaireName) => {
                if (questionnaireName === "foo") {
                    return {
                        questions: [
                            "Question 1",
                            "Question 2"
                        ],
                        decisions: [
                            "Suggestion"
                        ]
                    };
                }
            }
        };

        const stubbedBeanStore = {
            getBean: (serviceName)=> {
                if (serviceName === "decisionSupportSessionService") {
                    return stubbedDecisionSupportSessionService;
                } else if (serviceName === "questionnaireService") {
                    return stubbedQuestionnaireService;
                }
            }
        };

        var exportService = new ExportService(null, stubbedBeanStore, stubbedFileSystemGateway);
        const contents = exportService.exportContents("foo");
        const expectedContents = `Question 1,Question 2,Suggestion
Answer 1,Answer 2,Paracetamol
`;
        expect(contents).to.equals(expectedContents);
    });
});