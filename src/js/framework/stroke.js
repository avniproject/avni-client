// import {
//     ask,
//     lessThan,
//     lessThanAndGreaterThan,
//     greaterThan,
//     Yes,
//     No,
//     end,
//     stringComparison,
//     numeric,
//     options,
//     when
// } from './DSL.js'

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



var howFast = ask("How fast do you run?", when(options({
    "Pretty Fast": [stringComparison("Pretty Fast"), end],
    "Not that fast": [stringComparison("Not that fast"), end]
})));

var ageRange = ask('How old are you?', when(numeric([
    [lessThan(20), end],
    [lessThanAndGreaterThan(20, 60), howFast],
    [greaterThan(60), end]])));

var stroke = ask('Do you feel any weakness?', when(options({
        "Yes": [Yes, ageRange],
        "No": [No, howFast]
    }
)));

export default stroke;