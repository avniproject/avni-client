import _ from 'lodash';

class Questionnaire {
  constructor(question, recurAnswers) {
    this.question = question;
    this.recurAnswers = recurAnswers;
  }

  getQuestion() {
    return this.question;
  }

  getOptions() {
    return this.recurAnswers.map((option) => option[0]);
  }

  answer(answer) {
    return _.find(this.recurAnswers, ((option) => option[1][0](answer)))[1][1];
  }
}

export default Questionnaire;