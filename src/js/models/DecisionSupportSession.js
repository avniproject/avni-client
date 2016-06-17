import QuestionnaireAnswers from "./QuestionnaireAnswers";

class DecisionSupportSession {
    static schema = {
        name: "DecisionSupportSession",
        properties: {
            conclusionSummary: "string",
            conclusionDetail: "string",
            questionnaireAnswers: "QuestionnaireAnswers"
        }
    };
    
    static newInstance(conclusion, questionnaireAnswers) {
        var decisionSupportSession = {};
        decisionSupportSession.conclusionSummary = conclusion.systemDecisionSummary;
        decisionSupportSession.conclusionDetail = conclusion.systemDecision;
        decisionSupportSession.questionnaireAnswers = questionnaireAnswers;
        return decisionSupportSession;
    }
}

export default DecisionSupportSession;