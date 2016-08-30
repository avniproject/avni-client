import SummaryField from "./SummaryField";
import Question from "./Question";

class SimpleQuestionnaire {
    static Numeric = "Numeric";
    static Duration = "Duration";
    static Text = "Text";

    constructor(questionnaireData, conceptService) {
        this.questionnaireConfigurations = questionnaireData;
        this.conceptService = conceptService;
    }

    getQuestion(questionIndex) {
        var questionConfiguration = this.questionnaireConfigurations.questions[questionIndex];
        const questionConcept = this.conceptService.getConceptByName(questionConfiguration.name);
        return new Question(questionConfiguration, questionConcept, questionIndex === 0, questionIndex === this.questionnaireConfigurations.questions.length - 1);
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

export default SimpleQuestionnaire;