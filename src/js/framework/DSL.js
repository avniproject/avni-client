var stringComparison = function (expectedString) {
    return function (userAnswer) {
        return expectedString.toLowerCase() === userAnswer.toLowerCase();
    };
};

var lessThan = function (upperBound) {
    return function (userAnswer) {
        return userAnswer < upperBound;
    };
};

var greaterThan = function (lowerBound) {
    return function (userAnswer) {
        return lowerBound < userAnswer;
    };
};

var lessThanAndGreaterThan = function (upperBound, lowerBound) {
    return function (userAnswer) {
        return greaterThan(lowerBound)(userAnswer) && lessThan(upperBound)(userAnswer);
    };

};

var end = function () {
};

var numeric = function (options) {
    return function () {
        var match = function (userAnswer) {

        };
        return {"type": "numeric", "match": match, "answers": "HELLO"};
    };
};

var options = function (options) {
    return function () {
        var choices = Object.keys(options);
        var match = function (userAnswer) {

        };
        return {"type": "options", "answers": choices, "match": match};
    };
};

var when = function (answers) {
    return function () {
        var answerType = answers();
        this.type = answerType.type;
        this.choices = answerType.answers;
        this.match = function (userAnswer) {
            return answerType.match(userAnswer);
        };
        return this;
    }.bind(this);
};

var Yes = stringComparison("Yes");

var No = stringComparison("No");

var ask = function (question, recurAnswer) {
    return {
        "question": question,
        "answer": recurAnswer
    };
};


export default {
    ask,
    end,
    Yes,
    No,
    lessThan,
    lessThanAndGreaterThan,
    greaterThan,
    stringComparison,
    numeric,
    options,
    when
};