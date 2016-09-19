import {expect} from 'chai';
import ExportService from "../../js/service/ExportService";
import QuestionAnswer from "../../js/models/QuestionAnswer";
import DecisionSupportSessionService from "../../js/service/DecisionSupportSessionService";
import QuestionnaireService from "../../js/service/QuestionnaireService";
import DecisionSupportSession from "../../js/models/DecisionSupportSession";

describe('QuestionnaireService', () => {
    it('Should populate foreign key type fields for questionnaire', () => {
        const stubbed
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