import Concepts from './Concepts.js';

class SimpleQuestionnaire {
  constructor(questionnaireData, concepts) {
    this.questionnaireData = questionnaireData;
    this.concepts = concepts;
    this.questionIndex = 0;
  }

  currentQuestion() {
    var questionConceptName = this.questionnaireData.questions[this.questionIndex];
    var conceptData = this.concepts.findByName(questionConceptName)
    return {
      question: questionConceptName,
      answer: {
        answerType: conceptData.datatype.name
      }
    };
  }
}

export default SimpleQuestionnaire;