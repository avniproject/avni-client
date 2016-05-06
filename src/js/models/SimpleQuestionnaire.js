class SimpleQuestionnaire {
  constructor(questionnaireData, concepts) {
    this.questionnaireData = questionnaireData;
    this.concepts = concepts;
    this.questionIndex = 0;
  }

  currentQuestion() {
    return {question: this.questionnaireData.questions[this.questionIndex], answer: ""}
  }
}

export default SimpleQuestionnaire;