class AbstractQuestion {
  constructor(question, recurAnswers) {
    this.question = question;
    this.recurAnswers = recurAnswers;
  }

  end() {
    return false;
  }

  getQuestion() {
    return this.question;
  }
}

export default AbstractQuestion;