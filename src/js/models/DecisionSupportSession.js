class DecisionSupportSession {
    static schema = {
        name: "DecisionSupportSession",
        properties: {
            questionnaireUUID: "string",
            questionAnswers: {type: "list", objectType: "QuestionAnswer"},
            decisions: {type: "list", objectType: "Decision"},
            saveDate: {type: "date"}
        }
    };

    static newInstance(questionnaireUUID, decisions, questionAnswers, savedDate) {
        var decisionSupportSession = {};
        decisionSupportSession.questionnaireUUID = questionnaireUUID;
        decisionSupportSession.questionAnswers = questionAnswers;
        decisionSupportSession.decisions = decisions;
        decisionSupportSession.saveDate = savedDate;
        return decisionSupportSession;
    }

    //These methods are static because when data is loaded from database then it would not instantiate the class
    static findQuestionAnswer(question, session) {
        var questionAnswer = session.questionAnswers.find((questionAnswer) => {
            return questionAnswer.question === question;
        });
        return questionAnswer;
    }

    static getDecisionFor(decisionKey, session) {
        return session.decisions.find((decision) => {
            return decision.name === decisionKey;
        }).code;
    }
}

export default DecisionSupportSession;