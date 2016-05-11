import Question from '../models/Question';

export function stringComparison(expectedString) {
  return function (userAnswer) {
    return expectedString.toLowerCase() === userAnswer.toLowerCase();
  };
}

export function lessThan(upperBound) {
  return function (userAnswer) {
    return userAnswer < upperBound;
  };
}

export function greaterThan(lowerBound) {
  return function (userAnswer) {
    return lowerBound < userAnswer;
  };
}

export function lessThanAndGreaterThan(upperBound, lowerBound) {
  return function (userAnswer) {
    return greaterThan(lowerBound)(userAnswer) && lessThan(upperBound)(userAnswer);
  };

}

export function end() {
}

export function numeric(options) {
  return function () {
    var match = function (userAnswer) {

    };
    return {"type": "numeric", "answers": "HELLO", "match": match};
  };
}

export function options(options) {
  return function () {
    var choices = Object.keys(options);
    var match = function (userAnswer) {
      return options[choices.filter(choiceItem => options[choiceItem][0](userAnswer))[0]][1];
    };
    return {"type": "options", "answers": choices, "match": match};
  };
}

export function when(answers) {
  return function () {
    var answerType = answers();
    this.type = answerType.type;
    this.choices = answerType.answers;
    this.match = function (userAnswer) {
      return answerType.match(userAnswer);
    };
    return this;
  }.bind(this);
}

export let Yes = stringComparison("Yes");

export let No = stringComparison("No");

export function ask(question, recurAnswer) {
  return new Question(question);
}