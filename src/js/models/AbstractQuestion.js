class AbstractQuestion {
  constructor(question, recurAnswers) {
    this.question = question;
    this.recurAnswers = recurAnswers;
  }

  getQuestion() {
    return this.question;
  }
}

export default AbstractQuestion;