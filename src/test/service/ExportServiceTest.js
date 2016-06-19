import {expect} from 'chai';
import ExportService from "../../js/service/ExportService";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import DecisionSupportSession from "../../js/models/DecisionSupportSession";

describe('Export Service', () => {
    it('Export', () => {
        const stubbedFileSystemGateway = {};

        const stubbedDecisionSupportSessionService = {
            getAll: (questionnaireName) => {
                const decisionSupportSession = DecisionSupportSession.newInstance(
                    "foo",
                    [{value: 'Paracetamol'}],
                    [QuestionAnswer.newInstance("Question 1", "Answer 1"), QuestionAnswer.newInstance("Question 2", "Answer 2")],
                    new Date());
                return [decisionSupportSession]
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
                        decisionKeys: [
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
        const header = `Question 1,Question 2,Suggestion,Created At`;
        expect(contents).to.contain(header);
        expect(contents).to.contain("Answer 1,Answer 2,Paracetamol");
    });
});