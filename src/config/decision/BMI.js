export let BMI_makeDecision = function (questionnaireAnswers) {
    var decision = {};
    decision.name = "BMI";
    decision.code = "N/A";

    const weight = questionnaireAnswers.getAnswerFor('Weight');
    const height = questionnaireAnswers.getAnswerFor('Height');
    const bmi = (weight * 10000)/(height * height);
    decision.value = `${bmi}`;

    return [decision];
};