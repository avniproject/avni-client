class AbstractQuestion {
  constructor(question, recurAnswers) {
    this.question = question;
    this.recurAnswers = recurAnswers;
  }

  end() {
    return false;
  }

  getAnswerType() {
    return undefined;
  }

  getQuestion() {
    return this.question;
  }
}

export default AbstractQuestion;