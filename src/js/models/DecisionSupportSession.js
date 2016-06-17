import QuestionnaireAnswers from "./QuestionnaireAnswers";

class DecisionSupportSession {
    static schema = {
        name: "DecisionSupportSession",
        properties: {
            questionnaireName: "string",
            conclusionSummary: "string",
            conclusionDetail: "string",
            questionnaireAnswers: "QuestionnaireAnswers"
        }
    };
    
    static newInstance(questionnaireName, conclusion, questionnaireAnswers) {
        var decisionSupportSession = {};
        decisionSupportSession.questionnaireName = questionnaireName;
        decisionSupportSession.conclusionSummary = conclusion.systemDecisionSummary;
        decisionSupportSession.conclusionDetail = conclusion.systemDecision;
        decisionSupportSession.questionnaireAnswers = questionnaireAnswers;
        return decisionSupportSession;
    }
}

export default DecisionSupportSession;