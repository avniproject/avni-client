class DecisionSupportSession {
    static schema = {
        name: "DecisionSupportSession",
        properties: {
            questionnaireName: "string",
            questionnaireAnswers: "QuestionnaireAnswers",
            decisions: {type: "list", objectType: "Decision" }
        }
    };
    
    static newInstance(questionnaireName, decisions, questionnaireAnswers) {
        var decisionSupportSession = {};
        decisionSupportSession.questionnaireName = questionnaireName;
        decisionSupportSession.questionnaireAnswers = questionnaireAnswers;
        decisionSupportSession.decisions = decisions;
        return decisionSupportSession;
    }
}

export default DecisionSupportSession;