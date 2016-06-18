class DecisionSupportSession {
    static schema = {
        name: "DecisionSupportSession",
        properties: {
            questionnaireName: "string",
            questionAnswers: {type: "list", objectType: "QuestionAnswer"},
            decisions: {type: "list", objectType: "Decision"},
            saveDate: {type: "date"}
        }
    };
    
    static newInstance(questionnaireName, decisions, questionAnswers, savedDate) {
        var decisionSupportSession = {};
        decisionSupportSession.questionnaireName = questionnaireName;
        decisionSupportSession.questionAnswers = questionAnswers;
        decisionSupportSession.decisions = decisions;
        decisionSupportSession.saveDate = savedDate;
        return decisionSupportSession;
    }
}

export default DecisionSupportSession;