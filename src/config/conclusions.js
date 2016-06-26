export let Sample_without_control_flow_conclusion = function (questionnaireAnswers) {
    var decision = {};
    decision.name = "Treatment";
    decision.code = "ABC001";
    decision.value = "The patient should be referred to the hospital immediately as he may having tuberculosis";
    return [decision];
};

const treatmentByDiagnosisAndCode = {
    "Malaria": {
        "X1": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        },
        "X2": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        },
        "X3": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        },
        "X4": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        },
        "X5": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        },
        "X6": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        },
        "X7": {
            "1": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 3
                }],
            "2": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }],
            "3": [
                {
                    "Medicine": "क्लोरोक्विन सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                },
                {
                    "Medicine": "पॅरासिटामॉल सायरप",
                    "Amount": 0.5,
                    "Number of times": 1
                }]
        }
    },
    "Cold": {
        "A1": {
        }
    }
};

const weightRangesToCode = [
    {start: 3.0, end: 5.5, code: "A1"},
    {start: 5.6, end: 7.9, code: "A2"},
    {start: 8.0, end: 13, code: "A3"},
    {start: 13, end: 15.9, code: "A4"},
    {start: 16, end: 25.5, code: "A5"},
    {start: 25.6, end: 32.5, code: "A6"},
    {start: 32.6, end: 1000, code: "A7"}
];

export let VHW_Lokbiradari_conclusion = function (questionnaireAnswers) {
    const weight = questionnaireAnswers.getAnswerFor('Weight');
    const diagnosis = questionnaireAnswers.getAnswerFor('Diagnosis');

    const weightRangeToCode = weightRangesToCode.find((weightRangeToCode) => {
        return weightRangeToCode.start <= weight && weightRangeToCode.end >= weight;
    });

    var decision = {};
    decision.name = "Treatment";
    decision.code = weightRangeToCode.code;
    var codeValue = treatmentByDiagnosisAndCode[diagnosis][weightRangeToCode.code];
    var message = "";
    for (var attr in codeValue) {
        message += attr;
        message += "\n";
        message += codeValue[attr];
        message += "\n\n";
    }
    decision.value = message;
    return [decision];
};

export let BMI_conclusion = function (questionnaireAnswers) {
    var decision = {};
    decision.name = "BMI";
    decision.code = "N/A";

    const weight = questionnaireAnswers.getAnswerFor('Weight');
    const height = questionnaireAnswers.getAnswerFor('Height');
    const bmi = (weight * 10000)/(height * height);
    decision.value = `${bmi}`;

    return [decision];
};
