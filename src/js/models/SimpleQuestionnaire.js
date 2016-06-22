import SummaryField from "./SummaryField";

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
            questionConcept: conceptData,
            questionDataType: conceptData.datatype.name,
            isFirstQuestion: this.questionIndex === 0,
            isLastQuestion: this.questionIndex === this.questionnaireData.questions.length - 1
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
        this.questionnaireData.summaryFields.map((summaryField) => {
            if (this.questions.indexOf(summaryField)) return new SummaryField(summaryField, SummaryField.Question);
            if (this.decisionKeys.indexOf(summaryField)) return new SummaryField(summaryField, SummaryField.DecisionKey);
        });
    }
    
    get name() {
        return this.questionnaireData.name;
    }
}

export default SimpleQuestionnaire;