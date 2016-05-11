import ChoiceQuestion from '../models/ChoiceQuestion';
import NumericQuestion from '../models/NumericQuestion';
import End from '../models/End';

class QuestionFactory {
  static getQuestion(question, recurAnswers) {
    return new {
      "options": ChoiceQuestion,
      "numeric": NumericQuestion
    }[recurAnswers["type"]](question, recurAnswers["answers"]);
  }

  static getEnd(question, recurAnswer) {
    return new End(question, recurAnswer);
  }
}

export default QuestionFactory;