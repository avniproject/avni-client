import SummaryField from "./SummaryField";
import Question from "./Question";

class SimpleQuestionnaire {
    static Numeric = "Numeric";
    static Duration = "Duration";
    static Text = "Text";
    static Date = "Date";
    static Coded = "Coded";

    constructor(questionnaire, conceptService) {
        this.questionnaire = questionnaire;
        this.conceptService = conceptService;
    }

    getQuestion(questionIndex) {
        var questionConfiguration = this.questionnaire.questions[questionIndex];
        const questionConcept = this.conceptService.getConceptByName(questionConfiguration.name);
        return new Question(questionConfiguration, questionConcept, questionIndex === 0, questionIndex === this.questionnaire.questions.length - 1);
    }

    getQuestion

    get questions() {
        return this.questionnaire.questions;
    }

    get decisionKeys() {
        return this.questionnaire.decisionKeys;
    }

    get summaryFields() {
        return this.questionnaire.summaryFields.map((summaryField) => {
            if (this.questions.find(function (question) {
                    return summaryField === question.name;
                }) !== undefined)
                return new SummaryField(summaryField, SummaryField.Question);
            if (this.decisionKeys.indexOf(summaryField) !== -1)
                return new SummaryField(summaryField, SummaryField.DecisionKey);
        });
    }

    get name() {
        return this.questionnaire.name;
    }
}

export default SimpleQuestionnaire;