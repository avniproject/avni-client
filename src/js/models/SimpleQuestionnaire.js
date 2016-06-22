import SummaryField from "./SummaryField";

class SimpleQuestionnaire {
    constructor(questionnaireData, concepts) {
        this.questionnaireData = questionnaireData;
        this.concepts = concepts;
        this.questionIndex = 0;
    }

    currentQuestion() {
        var questionConceptName = this.questionnaireData.questions[this.questionIndex].name;
        var conceptData = this.concepts.findByName(questionConceptName);
        var mandatoryValue = this.questionnaireData.questions[this.questionIndex].mandatory;
        var questionAnswer = {
            question: questionConceptName,
            questionDataType: conceptData.datatype.name,
            isFirstQuestion: this.questionIndex === 0,
            isLastQuestion: this.questionIndex === this.questionnaireData.questions.length - 1,
            isMandatory: mandatoryValue === undefined ? true : mandatoryValue
        };
        questionAnswer.answers = conceptData.answers === undefined ? [] : conceptData.answers;
        return questionAnswer;
    }

    setQuestionIndex(index) {
        this.questionIndex = index;
    }

    get questions() {
        return this.questionnaireData.questions;
    }

    get decisionKeys() {
        return this.questionnaireData.decisionKeys;
    }

    get summaryFields() {
        return this.questionnaireData.summaryFields.map((summaryField) => {
            if (this.questions.find(function (question) {
                    return summaryField === question.name;
                }) !== undefined)
                return new SummaryField(summaryField, SummaryField.Question);
            if (this.decisionKeys.indexOf(summaryField) !== -1)
                return new SummaryField(summaryField, SummaryField.DecisionKey);
        });
    }

    get name() {
        return this.questionnaireData.name;
    }
}

export default SimpleQuestionnaire;