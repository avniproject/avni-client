import {expect} from 'chai';
import ExportService from "../../js/service/ExportService";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import DecisionSupportSessionService from "../../js/service/DecisionSupportSessionService";
import QuestionnaireService from "../../js/service/QuestionnaireService";
import DecisionSupportSession from "../../js/models/DecisionSupportSession";


describe('Export Service', () => {
    it('Export', () => {

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
            getQuestionnaire: (questionnaireUUID) => {
                if (questionnaireUUID === "94d3b225-b339-4f6e-8ba3-549df4ee8fac") {
                    return {
                        questions: [
                            {
                                name: "Question 1"
                            },
                            {
                                name: "Question 2"
                            }
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
                if (serviceName === DecisionSupportSessionService) {
                    return stubbedDecisionSupportSessionService;
                } else if (serviceName === QuestionnaireService) {
                    return stubbedQuestionnaireService;
                }
            }
        };

        var exportService = new ExportService(null, stubbedBeanStore);
        const contents = exportService.exportContents({name: "foo", uuid: "94d3b225-b339-4f6e-8ba3-549df4ee8fac"});
        const header = `Question 1,Question 2,Suggestion,Created At`;
        expect(contents).to.contain(header);
        expect(contents).to.contain("Answer 1,Answer 2,Paracetamol");
    });
});