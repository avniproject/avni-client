import DecisionSupportSession from './DecisionSupportSession';

class SummaryField {
    constructor(summaryFieldName, summaryFieldType) {
        this.summaryFieldName = summaryFieldName;
        this.summaryFieldType = summaryFieldType;
    }
    
    getValueFrom(session) {
        if (this.summaryFieldType === SummaryField.Question) {
            var questionAnswer = DecisionSupportSession.findQuestionAnswer(this.summaryFieldName, session);
            return questionAnswer.answerAsString();
        } else if (this.summaryFieldType === SummaryField.DecisionKey) {
            return DecisionSupportSession.getDecisionFor(this.summaryFieldName, session);
        }
    }
}

SummaryField.Question = "Question";
SummaryField.DecisionKey = "DecisionKey";

export default SummaryField;