import SummaryField from "./SummaryField";
import _ from 'lodash';

class SimpleQuestionnaire {
    static Numeric = "Numeric";
    static Text = "Text";

    constructor(questionnaireData, conceptService) {
        this.questionnaireConfigurations = questionnaireData;
        this.conceptService = conceptService;
    }

    getQuestion(questionIndex) {
        var questionConfiguration = this.questionnaireConfigurations.questions[questionIndex];
        const questionConcept = this.conceptService.getConceptByName(questionConfiguration.name);
        return {
            name: questionConfiguration.name,
            questionDataType: questionConcept.datatype.name,
            isFirstQuestion: questionIndex === 0,
            isLastQuestion: questionIndex === this.questionnaireConfigurations.questions.length - 1,
            isMandatory: _.isNil(questionConfiguration.mandatory) ? true : questionConfiguration.mandatory,
            isMultiSelect: _.isNil(questionConfiguration.multiSelect) ? false : questionConfiguration.multiSelect,
            answers: questionConcept.answers === undefined ? [] : questionConcept.answers,
            lowAbsolute: questionConcept.lowAbsolute,
            hiAbsolute: questionConcept.hiAbsolute
        };
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