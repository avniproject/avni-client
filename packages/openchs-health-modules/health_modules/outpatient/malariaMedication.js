import RuleCondition from "../../../rules-config/src/rules/RuleCondition";
import _ from "lodash";

const paracheckResultContains = (encounter, ...values) => {
    return new RuleCondition({programEncounter: encounter})
        .valueInEncounter("Paracheck")
        .containsAnyAnswerConceptName(...values)
        .matches();
};
const paracheckNotDone = (encounter) => {
    return new RuleCondition({programEncounter: encounter})
        .valueInEncounter("Paracheck")
        .is.notDefined
        .matches();
};
const isPvPositive = (encounter) => paracheckResultContains(encounter, "Positive for PF and PV", "Positive for PV");
const isPfPositive = (encounter) => paracheckResultContains(encounter, "Positive for PF and PV", "Positive for PF");

const ageRangesForAct = [
    {code: "A1", min: 1, max: 4},
    {code: "A2", min: 4, max: 8},
    {code: "A3", min: 8, max: 14},
    {code: "A4", min: 14, max: 1000}
];

const weightRangesForPrimaquine = [
    {code: "A1", min: 9.9, max: 12.9},
    {code: "A2", min: 12.9, max: 15.9},
    {code: "A3", min: 15.9, max: 25.5},
    {code: "A4", min: 25.5, max: 32.5},
    {code: "A5", min: 32.5, max: 45.5},
    {code: "A6", min: 45.5, max: 1000}
];

const weightRangesForPcmOrChloroquineSyrup = [
    {code: "A1", min: 2.9, max: 5.5},
    {code: "A2", min: 5.5, max: 7.9},
    {code: "A3", min: 7.9, max: 13}
];

const weightRangesForPcmOrChloroquineTablets = [
    {code: "A1", min: 12.9, max: 15.9},
    {code: "A2", min: 15.9, max: 25.5},
    {code: "A3", min: 25.5, max: 32.5},
    {code: "A4", min: 32.5, max: 1000}
];

const matchByType = (codeMap, valueMap, variableFn) => {
    return (encounter) => {
        const variable = variableFn(encounter);
        if (_.isNil(variable)) return null;

        const matchingCode = _.find(codeMap, (code) => code.min < variable && code.max >= variable);
        return matchingCode && _.filter(valueMap, (value) => value.code === matchingCode.code);
    }

};
const matchByAge = (codeMap, valueMap) => matchByType(codeMap, valueMap, (encounter) => (encounter.individual.getAgeInWeeks(encounter.encounterDateTime, true) / 52));

const matchByWeight = (codeMap, valueMap) => {
    return (encounter) => {
        const weightObs = encounter.findObservation("Weight");
        if (_.isNil(weightObs)) return null;

        const weight = weightObs.getValue();
        const matchingCode = _.find(codeMap, (code) => code.min < weight && code.max >= weight);
        return matchingCode && _.filter(valueMap, (value) => value.code === matchingCode.code);
    }
};

const womanBetween16And40Years = (encounter) => {
    return new RuleCondition({programEncounter: encounter})
        .female
        .and.age.is.greaterThanOrEqualTo(16)
        .and.age.is.lessThanOrEqualTo(40)
        .matches();
};

const childBelow1Year = (encounter) => {
    return new RuleCondition({programEncounter: encounter})
        .age.is.lessThan(1)
        .matches();
};

const pregnant = (encounter) => {
    let matches = new RuleCondition({programEncounter: encounter})
        .valueInEncounter("Complaint")
        .containsAnswerConceptName("Pregnancy")
        .matches();
    return matches;
};

const primaquineRequired = (encounter) => !childBelow1Year(encounter)
    && !womanBetween16And40Years(encounter)
    && isPvPositive(encounter)
    && !pregnant(encounter);

const actRequired = (encounter) => isPfPositive(encounter) 
    && !womanBetween16And40Years(encounter)
    && !pregnant(encounter) ;

const pcmRequired = () => true; //you come here only if you have fever.

const chloroquineRequired = (encounter) => paracheckResultContains(encounter, "Positive for PV", "Negative")
    || paracheckNotDone(encounter)
    || (isPfPositive(encounter) && (pregnant(encounter) || womanBetween16And40Years(encounter)));

const malariaTreatment = [
    {
        check: pcmRequired,
        medication: [{
            medicine: "Paracetamol Syrup",
            dosageType: "uniform",
            form: "spoon",
            dosageFn: matchByWeight(weightRangesForPcmOrChloroquineSyrup, [
                {days: 3, code: "A1", itemsPerServing: 0.5, timesPerDay: 3},
                {days: 3, code: "A2", itemsPerServing: 1, timesPerDay: 3},
                {days: 3, code: "A3", itemsPerServing: 1.5, timesPerDay: 3},
            ])
        }]
    },
    {
        check: pcmRequired,
        medication: [{
            medicine: "Paracetamol Tablets",
            dosageType: "uniform",
            form: "Tablets",
            dosageFn: matchByWeight(weightRangesForPcmOrChloroquineTablets, [
                {days: 3, code: "A1", itemsPerServing: 0.5, timesPerDay: 2},
                {days: 3, code: "A2", itemsPerServing: 0.5, timesPerDay: 3},
                {days: 3, code: "A3", itemsPerServing: 1, timesPerDay: 2},
                {days: 3, code: "A4", itemsPerServing: 1, timesPerDay: 3},
            ])
        }]
    },
    {
        check: chloroquineRequired,
        medication: [{
            medicine: "Chloroquine Syrup",
            dosageType: "uniform",
            form: "spoon",
            dosageFn: matchByWeight(weightRangesForPcmOrChloroquineSyrup, [
                {days: 3, code: "A1", itemsPerServing: 0.5, timesPerDay: 1},
                {days: 3, code: "A2", itemsPerServing: 1, timesPerDay: 1},
                {days: 3, code: "A3", itemsPerServing: 2, timesPerDay: 1}
            ])
        }]
    },
    {
        check: chloroquineRequired,
        medication: [{
            medicine: "Chloroquine Tablets",
            dosageType: "daywise",
            form: "Tablets",
            dosageFn: matchByWeight(weightRangesForPcmOrChloroquineTablets, [
                {day: 1, code: "A1", itemsPerServing: 1, timesPerDay: 1},
                {day: 2, code: "A1", itemsPerServing: 1, timesPerDay: 1},
                {day: 3, code: "A1", itemsPerServing: 0.5, timesPerDay: 1},

                {day: 1, code: "A2", itemsPerServing: 2, timesPerDay: 1},
                {day: 2, code: "A2", itemsPerServing: 2, timesPerDay: 1},
                {day: 3, code: "A2", itemsPerServing: 1, timesPerDay: 1},

                {day: 1, code: "A3", itemsPerServing: 3, timesPerDay: 1},
                {day: 2, code: "A3", itemsPerServing: 3, timesPerDay: 1},
                {day: 3, code: "A3", itemsPerServing: 1.5, timesPerDay: 1},

                {day: 1, code: "A4", itemsPerServing: 4, timesPerDay: 1},
                {day: 2, code: "A4", itemsPerServing: 4, timesPerDay: 1},
                {day: 3, code: "A4", itemsPerServing: 2, timesPerDay: 1}
            ])
        }]
    },
    {
        check: primaquineRequired,
        medication: [{
            medicine: "Primaquine Tablets",
            form: "Tablets",
            dosageType: "uniform",
            dosageUnit: "mg",
            dosageFn: matchByWeight(weightRangesForPrimaquine, [
                {days: 14, code: "A1", dosage: 2.5, itemsPerServing: 1, timesPerDay: 1},
                {days: 14, code: "A2", dosage: 7.5, itemsPerServing: 0.5, timesPerDay: 1},
                {days: 14, code: "A3", dosage: 2.5, itemsPerServing: 2, timesPerDay: 1},
                {days: 14, code: "A4", dosage: 7.5, itemsPerServing: 1, timesPerDay: 1},
                {days: 14, code: "A5", dosage: 10, itemsPerServing: 1, timesPerDay: 1},
                {days: 14, code: "A6", dosage: 15, itemsPerServing: 1, timesPerDay: 1},
            ]),
        }]
    },
    {
        check: actRequired,
        medication: [{
            medicine: "ACT",
            form: "Tablets",
            dosageType: "daywise",
            dosageFn: matchByAge(ageRangesForAct, [
                {day: 1, code: "A1", row: 1, itemsPerServing: 2},
                {day: 2, code: "A1", row: 2, itemsPerServing: 1},
                {day: 3, code: "A1", row: 3, itemsPerServing: 1},

                {day: 1, code: "A2", row: 1, itemsPerServing: 2},
                {day: 2, code: "A2", row: 2, itemsPerServing: 1},
                {day: 3, code: "A2", row: 3, itemsPerServing: 1},

                {day: 1, code: "A3", row: 1, itemsPerServing: 3},
                {day: 2, code: "A3", row: 2, itemsPerServing: 1},
                {day: 3, code: "A3", row: 3, itemsPerServing: 1},

                {day: 1, code: "A4", row: 1, itemsPerServing: 3},
                {day: 2, code: "A4", row: 2, itemsPerServing: 1},
                {day: 3, code: "A4", row: 3, itemsPerServing: 1}
            ])
        }]
    }
];

const prescription = (encounter) => {
    return _.chain(malariaTreatment)
        .map((treatment) => {
            return treatment.check(encounter) && _.map(treatment.medication, (medication) => {
                return {
                    medicine: medication.medicine,
                    dosage: medication.dosageFn(encounter),
                    dosageType: medication.dosageType,
                    dosageUnit: medication.dosageUnit,
                    form: medication.form
                }
            })
        })
        .flatten()
        .compact()
        .filter((treatment) => _.isArray(_.get(treatment, 'dosage')) && treatment.dosage.length > 0)
        .flatMap((item) => {
            return item.dosage ? _.reduce(item.dosage, (flattenedResult, dosage) => {
                return _.concat(flattenedResult, {
                    medicine: item.medicine,
                    dosage: dosage,
                    dosageType: item.dosageType,
                    dosageUnit: item.dosageUnit,
                    form: item.form
                });
            }, []) : item
        })
        .value();
};

const dayth = (day) => {
    return {
        1: "पहिल्या",
        2: "दुसऱ्या",
        3: "तिसऱ्या"
    }[day];
};

const lookup = {
    "Primaquine Tablets": "प्रायामाक्वीन",
    "ACT": "आरटीमीथर कॉम्बीणेशन थेरपी",
    "Chloroquine Syrup": "क्लोरोक्विन सायरप",
    "Paracetamol Syrup": "पॅरासिटामॉल सायरप",
    "Chloroquine Tablets": "क्लोरोक्विन",
    "Paracetamol Tablets": "पॅरासिटामॉल",
    "mg": "mg",
    "spoon": "चमचा",
    "Tablet": "गोळी",
    "Tablets": "गोळ्या"
};

const numberToText = (number) => {
    return {0.5: "अर्धी", 1: "एक", 1.5: "दीड", 2: "दोन", 3: "तीन", 4: "चार"}[number] || number;
};

const numberToTextMale = (number) => {
    return {0.5: "अर्धा", 1: "एक", 1.5: "दीड", 2: "दोन", 3: "तीन", 4: "चार"}[number] || number;
};

const numberTranslator = (number) => {
    const numbers = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
    return _.reduce(_.split(number, ''), (marathiNumber, token) => {
        return marathiNumber + (numbers[_.toNumber(token)] || token);
    }, "")
};

const translateForm = (form, dosage) => {
    if (form === "spoon") return lookup["spoon"];
    if (form === "Tablets") return dosage.itemsPerServing <= 1 ? lookup["Tablet"] : lookup["Tablets"];
};

const translateForRegularDosage = (prescription) => {
    let translation = "", dosage = prescription.dosage;
    translation = translation + lookup[prescription.medicine] + " ";
    translation = translation + (dosage.dosage ? numberTranslator(dosage.dosage) + " " : "");
    translation = translation + (prescription.dosageUnit ? lookup[prescription.dosageUnit] + " " : "");
    if (dosage.dosage === 10 && prescription.medicine === "Primaquine Tablets") {
        translation = translation + "(७.५ mg+२.५ mg) ";
    }
    translation = translation + (prescription.form === 'Tablets' ? numberToText(dosage.itemsPerServing) : numberToTextMale(dosage.itemsPerServing)) + " ";
    translation = translation + translateForm(prescription.form, dosage) + " ";
    translation = translation + (dosage.timesPerDay ? "दिवसातून " + numberTranslator(dosage.timesPerDay) + " वेळा " : "");
    translation = translation + "१ ते " + numberTranslator(dosage.days) + " दिवसांसाठी";
    return translation;
};

const translateFordaywiseDose = (prescription) => {
    let translation = "", dosage = prescription.dosage;
    translation = translation + lookup[prescription.medicine] + " ";
    translation = translation + (dosage.row ? dayth(dosage.row) + " रांगेतील " : "");
    translation = translation + (prescription.form === 'Tablets' ? numberToText(dosage.itemsPerServing) : numberToTextMale(dosage.itemsPerServing)) + " ";
    translation = translation + translateForm(prescription.form, dosage) + " ";
    translation = translation + (dosage.timesPerDay ? "दिवसातून " + numberTranslator(dosage.timesPerDay) + " वेळा " : "");
    return translation;
};

const convertPrescriptionsToMarathi = (prescriptions) => {
    const daywisePrescriptions = _.chain(prescriptions)
        .filter((prescription) => prescription.dosageType === "daywise")
        .map((prescription) => {
            return {
                day: prescription.dosage.day,
                medicine: prescription.medicine,
                message: translateFordaywiseDose(prescription)
            }
        })
        .sortBy('day', 'medicine')
        .groupBy((item) => item.day)
        .map((prescriptions) => {
            const header = dayth(prescriptions[0].day) + " दिवशी\n";
            return header + _.join(_.map(prescriptions, 'message'), "\n");
        })
        .join("\n")
        .value();

    const uniformPrescriptions = _.chain(prescriptions)
        .filter((prescription) => prescription.dosageType === "uniform")
        .reduce((stringsForPrescription, prescription) => _.concat(stringsForPrescription,
            ((prescription) => translateForRegularDosage(prescription))(prescription)), [])
        .join("\n")
        .value();

    return daywisePrescriptions + "\n\n" + uniformPrescriptions;
};

const malariaPrescriptionMessage = (encounter) => {
    return convertPrescriptionsToMarathi(prescription(encounter));
};

export {prescription, convertPrescriptionsToMarathi, malariaPrescriptionMessage};
