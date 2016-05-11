import ChoiceQuestion from '../models/ChoiceQuestion';
import NumericQuestion from '../models/NumericQuestion';

class QuestionFactory {
  static getQuestion(question, recurAnswers) {
    return new {
      "options": ChoiceQuestion,
      "numeric": NumericQuestion
    }[recurAnswers["type"]](question, recurAnswers["answers"]);
  }
}

export default QuestionFactory;