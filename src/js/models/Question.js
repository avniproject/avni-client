class Question {
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
}

export default Question;