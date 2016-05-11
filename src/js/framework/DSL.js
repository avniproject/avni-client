import QuestionFactory from '../factory/QuestionFactory';

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

const inferType = (type) => (answers) => {
  return {"type": type, "answers": answers};
};

export function numeric(answers) {
  return inferType("numeric")(answers);
}

export function options(options) {
  return inferType("options")(options);
}

export let end = QuestionFactory.getEnd();

export function when(answers) {
  return answers;
}

export let Yes = stringComparison("Yes");

export let No = stringComparison("No");

export function ask(question, recurAnswer) {
  return QuestionFactory.getQuestion(question, recurAnswer);
}