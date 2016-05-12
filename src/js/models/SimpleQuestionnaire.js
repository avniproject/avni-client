class SimpleQuestionnaire {
    constructor(questionnaireData, concepts) {
        this.questionnaireData = questionnaireData;
        this.concepts = concepts;
        this.questionIndex = 0;
    }

    currentQuestion() {
        var questionConceptName = this.questionnaireData.questions[this.questionIndex];
        var conceptData = this.concepts.findByName(questionConceptName);
        var questionAnswer = {
            question: questionConceptName,
            questionDataType: conceptData.datatype.name
        };
        questionAnswer.answers = conceptData.answers === undefined ? [] : conceptData.answers;
        return questionAnswer;
    }
}

export default SimpleQuestionnaire;