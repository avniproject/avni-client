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

    //These methods are static because when data is loaded from database then it would not instantiate the class
    static getAnswerFor(question, session) {
        return session.questionAnswers.find((questionAnswer) => {
            return questionAnswer.question === question;
        }).answer;
    }

    static getDecisionFor(decisionKey, session) {
        return session.decisions.find((decision) => {
            return decision.name === decisionKey;
        }).value;
    }
}

export default DecisionSupportSession;