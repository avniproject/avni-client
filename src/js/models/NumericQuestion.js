import _ from 'lodash';

import AbstractQuestion from './AbstractQuestion';

class NumericQuestion extends AbstractQuestion {
  getAnswerType() {
    return "Numeric";
  }

  answer(answer) {
    return _.find(this.recurAnswers, ((option) => option[0](answer)))[1];
  }
}

export default NumericQuestion;