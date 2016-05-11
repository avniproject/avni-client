import _ from 'lodash';

import AbstractQuestion from './AbstractQuestion';

class ChoiceQuestion extends AbstractQuestion {

  getOptions() {
    return this.recurAnswers.map((option) => option[0]);
  }

  answer(answer) {
    return _.find(this.recurAnswers, ((option) => option[1][0](answer)))[1][1];
  }
}

export default ChoiceQuestion;