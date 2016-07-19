import SummaryField from "./SummaryField";

class SimpleQuestionnaire {
    constructor(questionnaireData, concepts) {
        this.questionnaireConfigurations = questionnaireData;
        this.questionnaireConcept = questionnaireConcept;
        this.currentQuestionIndex = 0;
    }

    getQuestion(questionIndex) {
        var questionConfiguration = this.questionnaireConfigurations.questions[questionIndex];
        return {
            name: questionConfiguration.name,
            questionDataType: this.questionnaireConcept.datatype.name,
            isFirstQuestion: questionIndex === 0,
            isLastQuestion: questionIndex === this.questionnaireConfigurations.questions.length - 1,
            isMandatory: questionConfiguration.mandatory === undefined ? true : questionConfiguration.mandatory,
            isMultiSelect: questionConfiguration.multiSelect === undefined ? false : questionConfiguration.multiSelect,
            answers: this.questionnaireConcept.answers === undefined ? [] : this.questionnaireConcept.answers,
            lowAbsolute: this.questionnaireConcept.lowAbsolute,
            hiAbsolute: this.questionnaireConcept.hiAbsolute
        };
    }

    prev() {
        this.currentQuestionIndex--;
    }

    next() {
        this.currentQuestionIndex++;
    }

    get questions() {
        return this.questionnaireConfigurations.questions;
    }

    get decisionKeys() {
        return this.questionnaireConfigurations.decisionKeys;
    }

    get summaryFields() {
        return this.questionnaireConfigurations.summaryFields.map((summaryField) => {
            if (this.questions.find(function (question) {
                    return summaryField === question.name;
                }) !== undefined)
                return new SummaryField(summaryField, SummaryField.Question);
            if (this.decisionKeys.indexOf(summaryField) !== -1)
                return new SummaryField(summaryField, SummaryField.DecisionKey);
        });
    }

    get name() {
        return this.questionnaireConfigurations.name;
    }
}

SimpleQuestionnaire.Numeric = 'Numeric';
SimpleQuestionnaire.Text = 'Text';

export default SimpleQuestionnaire;