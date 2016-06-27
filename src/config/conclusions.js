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
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }],
            "2": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }],
            "3": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X2": {
            "1": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon Syrup",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Dose Unit": "Spoon",
                    "Amount": 1,
                    "Times": 3
                }],
            "2": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Dose Unit": "Spoon",
                    "Amount": 1,
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }],
            "3": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X3": {
            "1": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 2,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 1.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }],
            "2": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 2,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 1.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }],
            "3": [
                {
                    "Medicine": "Chloroquin Syrup",
                    "Amount": 2,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol Syrup",
                    "Amount": 1.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X4": {
            "1": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }],
            "2": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }],
            "3": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X5": {
            "1": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }],
            "2": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }],
            "3": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        },
        "X6": {
            "1": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 3,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }],
            "2": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 3,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }],
            "3": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 1.5,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X7": {
            "1": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 4,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }],
            "2": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 4,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }],
            "3": [
                {
                    "Medicine": "Chloroquin",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": 1
                },
                {
                    "Medicine": "Paracetamol",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        }
    },
    "Cold": {
        "X1": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.25,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X2": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X3": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X4": {
            "3-5": [
                {
                    "Medicine": "Cetrizine Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "Once Evening"
                }
            ]
        },
        "X5": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                }
            ]
        },
        "X6": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                }
            ]
        },
        "X7": {
            "3-5": [
                {
                    "Medicine": "Cetrizine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "Once Evening"
                }
            ]
        }
    },
    "Cough": {
        "X1": {
            "3-5": [
                {
                    "Medicine": "Ceptron Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X2": {
            "3-5": [
                {
                    "Medicine": "Ceptron Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X3": {
            "3-5": [
                {
                    "Medicine": "Ceptron Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X4": {
            "3-5": [
                {
                    "Medicine": "Ceptron",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "3-5": [
                {
                    "Medicine": "Ceptron",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "3-5": [
                {
                    "Medicine": "Ceptron",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "3-5": [
                {
                    "Medicine": "Ceptron",
                    "Amount": 2,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Diarrhoea": {
        "X1": {
            "1": [
                {
                    "Medicine": "Furoxone Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                },
                {
                    "Medicine": "Abdak Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X2": {
            "1": [
                {
                    "Medicine": "Furoxone Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon Syrup",
                    "Times": 1
                },
                {
                    "Medicine": "Abdak Syrup",
                    "Dose Unit": "Spoon",
                    "Amount": 1,
                    "Times": 3
                }]
        },
        "X3": {
            "1": [
                {
                    "Medicine": "Furoxone Syrup",
                    "Amount": 2,
                    "Dose Unit": "Spoon",
                    "Times": 1
                },
                {
                    "Medicine": "Abdak Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": 3
                }]
        },
        "X4": {
            "1": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Abdak",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X5": {
            "1": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Abdak",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X6": {
            "1": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                },
                {
                    "Medicine": "Abdak",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 2
                }]
        },
        "X7": {
            "1": [
                {
                    "Medicine": "Furoxone",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                },
                {
                    "Medicine": "Abdak",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": 3
                }]
        }
    },
    "Vomiting": {
        "X1": {
            "1,2,3": [
                {
                    "Medicine": "Onden Syrup",
                    "Amount": 1,
                    "Dose Unit": "ml",
                    "Times": "2"
                }
            ]
        },
        "X2": {
            "1,2,3": [
                {
                    "Medicine": "Onden Syrup",
                    "Amount": 2,
                    "Dose Unit": "ml",
                    "Times": "2"
                }
            ]
        },
        "X3": {
            "1,2,3": [
                {
                    "Medicine": "Onden Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X4": {
            "1,2,3": [
                {
                    "Medicine": "Onden Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "1,2,3": [
                {
                    "Medicine": "Perinorm",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1,2,3": [
                {
                    "Medicine": "Perinorm",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1,2,3": [
                {
                    "Medicine": "Perinorm",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    },
    "Abdominal Pain": {
        "X1": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam Syrup",
                    "Amount": 0.5,
                    "Dose Unit": "ml",
                    "Times": "3"
                }
            ]
        },
        "X2": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam Syrup",
                    "Amount": 1,
                    "Dose Unit": "ml",
                    "Times": "3"
                }
            ]
        },
        "X3": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam Syrup",
                    "Amount": 1,
                    "Dose Unit": "Spoon",
                    "Times": "3"
                }
            ]
        },
        "X4": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X5": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "3"
                }
            ]
        },
        "X6": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1,2": [
                {
                    "Medicine": "Cyroclopam",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "3"
                }
            ]
        }
    },
    "Acidity": {
        "X4": {
            "1,2": [
                {
                    "Medicine": "Femotidine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "1"
                }
            ]
        },
        "X5": {
            "1,2": [
                {
                    "Medicine": "Femotidine",
                    "Amount": 0.5,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X6": {
            "1,2": [
                {
                    "Medicine": "Femotidine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        },
        "X7": {
            "1,2": [
                {
                    "Medicine": "Femotidine",
                    "Amount": 1,
                    "Dose Unit": "Tablet",
                    "Times": "2"
                }
            ]
        }
    }
};

const weightRangesToCode = [
    {start: 3.0, end: 5.5, code: "X1"},
    {start: 5.6, end: 7.9, code: "X2"},
    {start: 8.0, end: 13, code: "X3"},
    {start: 13, end: 15.9, code: "X4"},
    {start: 16, end: 25.5, code: "X5"},
    {start: 25.6, end: 32.5, code: "X6"},
    {start: 32.6, end: 1000, code: "X7"}
];

const englishWordsToMarathi = {
    Chloroquin: "क्लोरोक्विन",
    "Chloroquin Syrup": "क्लोरोक्विन सायरप",
    "Paracetamol Syrup": "पॅरासिटामॉल सायरप",
    Spoon: "चमचा",
    Tablet: "टॅबलेट",
    "Cetrizine": "सेट्रीझीन",
    "Cetrizine Syrup": "सेट्रीझीन सायरप",
    "Furoxone Syrup":  "फ्युरोक्सोन सायरप",
    "Furoxone":  "फ्युरोक्सोन",
    "Abdak Syrup": "अबडक",
    "BC": "बीसी",
    "Perinorm": "पेरीनॉर्म",
    "Onden": "ऑन्डेन सायरप",
    "Cyroclopam Syrup": "सायरप सायक्लोपाम",
    "Cyroclopam": "सायक्लोपाम",
    "Femotidine": "फॅमोटिडीन"
};

var doseQuantityToMarathi = function (doseQuantity, doseUnit) {
    if (doseQuantity === 0.25) return "१/४";
    if (doseQuantity === 0.5 && doseUnit === "Spoon") return "अर्धा";
    if (doseQuantity === 0.5 && doseUnit === "Tablet") return "अर्धी";
    if (doseQuantity === 1) return "१";
    if (doseQuantity === 1.5) return "दीड";
    if (doseQuantity === 2) return "२";
    if (doseQuantity === 3) return "३";
    if (doseQuantity === 4) return "४";
    console.error(`Dose quantity - ${doseQuantity} for dose unit - ${doseUnit} is not supported`);
};

var dosageTimingToMarathi = function (times) {
    if (times === 1) return "दिवसातून एकदा";
    if (times === 2) return "दिवसातून दोन वेळा";
    if (times === 3) return "दिवसातून तीन वेळा";
    if (times === "Once Evening") return "रोज संध्याकाळी एकदा";
    console.error(`Number of times ${times} not supported yet`);
};

export let VHW_Lokbiradari_conclusion = function (questionnaireAnswers) {
    const weight = questionnaireAnswers.getAnswerFor('Weight');
    const diagnosis = questionnaireAnswers.getAnswerFor('Diagnosis');
    const age = questionnaireAnswers.getAnswerFor('Age');

    const weightRangeToCode = weightRangesToCode.find((weightRangeToCode) => {
        return weightRangeToCode.start <= weight && weightRangeToCode.end >= weight;
    });

    var decision = {};
    decision.name = "Treatment";
    decision.code = weightRangeToCode.code;
    var prescription = treatmentByDiagnosisAndCode[diagnosis][weightRangeToCode.code];
    var message = "";
    for (var day = 1; day <= 3; day++) {
        for (var medicine = 0; medicine < prescription[`${day}`].length; medicine++) {
            const daysPrescription = prescription[`${day}`][medicine];
            message += englishWordsToMarathi[`${daysPrescription.Medicine}`];
            message += " ";
            message += englishWordsToMarathi[`${daysPrescription["Dose Unit"]}`];
            message += " ";
            message += doseQuantityToMarathi(daysPrescription.Amount, daysPrescription["Dose Unit"]);
            message += " ";
            message += daysPrescription.Amount < 2 ? "चमचा" : "चमचे";
            message += " ";
            message += dosageTimingToMarathi(daysPrescription.Times);
            message += "\n";
        }
        message += "\n";
    }
    decision.value = message;

    if (weight >= 13 && diagnosis === "Malaria") {
        decision.alert = "क्लोरोक्विन व पॅरासिटामॉल ही औषधे जेवल्यावर खायला सांगावी";
    } else if (diagnosis === 'Cough' && age >= 16 && age <= 40 && weight >= 13)
        decision.alert = "१६ ते ४० वर्षाच्या बायकांना सेप्ट्रान देऊ नये त्याऐवजी सिफ्रान १गोळी दिवसातून २ वेळा द्यावी";
    else if (diagnosis === 'Vomiting')
        decision.alert = "उलटी असल्यास आधी औषध द्यावे व अर्ध्या तासांनंतर जेवण, दुध द्यावे व अर्ध्या तासांनंतर इतर औषधे द्यावीत";

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
