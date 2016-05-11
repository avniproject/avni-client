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

export let Yes = stringComparison("Yes");

export let No = stringComparison("No");