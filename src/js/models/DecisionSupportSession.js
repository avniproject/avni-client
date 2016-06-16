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
    
    constructor(conclusion, questionnaireAnswers) {
        this.conclusionSummary = conclusion.systemDecisionSummary;
        this.conclusionDetail = conclusion.systemDecision;
        this.questionnaireAnswers = questionnaireAnswers;
    }
}

export default DecisionSupportSession;