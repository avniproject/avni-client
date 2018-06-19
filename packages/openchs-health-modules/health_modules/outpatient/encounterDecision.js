import {malariaPrescriptionMessage} from "./malariaMedication";
import OPDFormHandler from "./formFilters/OPDFormHandler";
import {FormElementsStatusHelper, RuleCondition} from "rules-config/rules";
import * as treatmentByComplaintAndCode from "./outpatientTreatments.json";
import _ from 'lodash';


const weightRangesToCode = [
    {start: 3.0, end: 5.5, code: "X1"},
    {start: 5.6, end: 8.0, code: "X2"},
    {start: 8.1, end: 13.0, code: "X3"},
    {start: 13.1, end: 16.0, code: "X4"},
    {start: 16.1, end: 25.5, code: "X5"},
    {start: 25.6, end: 32.5, code: "X6"},
    {start: 32.6, end: 1000, code: "X7"}
];

const weightRangesToCodeForLonartForte = [
    {start: 3.0, end: 4.9, code: "X0"},
    {start: 5.0, end: 14.9, code: "X1"},
    {start: 15, end: 24.9, code: "X2"},
    {start: 25, end: 34.9, code: "X3"},
    {start: 35, end: 1000, code: "X4"},
];

const complaintToWeightRangesToCodeMap = {
    //"Chloroquine Resistant Malaria": weightRangesToCodeForLonartForte
};

const englishWordsToMarathi = {
    "Chloroquin": "क्लोरोक्विन",
    "Chloroquin Syrup": "क्लोरोक्विन सायरप",
    "Paracetamol Syrup": "पॅरासिटामॉल सायरप",
    "Paracetamol": "पॅरासिटामॉल",
    "Spoon": "चमचा",
    "Tablet": "टॅबलेट",
    "Cetrizine": "सेट्रीझीन",
    "Cetrizine Syrup": "सेट्रीझीन सायरप",
    "Furoxone Syrup": "फ्युरोक्सोन सायरप",
    "Furoxone": "फ्युरोक्सोन",
    "Abdek": "अबडक",
    "Abdek Syrup": "अबडक सायरप",
    "BC": "बीसी",
    "Perinorm": "पेरीनॉर्म",
    "Ondensetran Syrup": "ऑन्डेन सायरप",
    "Cyclopam Syrup": "सायरप सायक्लोपाम",
    "Cyclopam": "सायक्लोपाम",
    "Famotidine": "फॅमोटिडीन",
    "Septran Syrup": "सायरप सेप्ट्रान",
    "Septran": "सेप्ट्रान",
    "Scabizol": "खरुजेचे औषध",
    "Salicylic Acid": "सॅलिसिलिक ऍसिड",
    "Iron Folic Acid": "आयरन",
    "Calcium": "कॅल्शियम",
    "Lonart Forte": "लोनर्ट फोर्टे",
    "Onden Syrup": "सायरप ओंडेन",
    "Cifran": "सिफ्रान",
    "Before": "जेवणाआधी",
    "After": "जेवणानंतर",
    "": "",
    "ORS": "ORS"
};

const dayInMarathi = {
    "1": "पहिल्या दिवशी",
    "2": "दुसऱ्या दिवशी",
    "3": "तिसऱ्या दिवशी"
};

const medicines = {
    "Abdek Syrup": {take: ""},
    "BC": {take: ""},
    "Calcium": {take: "Before"},
    "Cetrizine": {take: "After"},
    "Cetrizine Syrup": {take: "After"},
    "Cifran": {take: "After"},
    "Chloroquin": {take: "After"},
    "Chloroquin Syrup": {take: "After"},
    "Cyclopam": {take: "After"},
    "Cyclopam Syrup": {take: "After"},
    "Famotidine": {take: "Before"},
    "Furoxone": {take: ""},
    "Furoxone Syrup": {take: ""},
    "Iron Folic Acid": {take: "After"},
    "Ondensetran Syrup": {take: "Before"},
    "Onden Syrup": {take: "Before"},
    "ORS": {take: ""},
    "Paracetamol": {take: "After"},
    "Paracetamol Syrup": {take: "After"},
    "Perinorm": {take: "Before"},
    "Lonart Forte": {take: "After"},
    "Salicylic Acid": {take: ""},
    "Scabizol": {take: ""},
    "Septran": {take: "After"},
    "Septran Syrup": {take: "After"}
};

const doseQuantityToMarathi = function (doseQuantity, doseUnit) {
    if (doseQuantity === 0.25) return "१/४";
    if (doseQuantity === 0.5 && doseUnit === "Spoon") return "अर्धा";
    if (doseQuantity === 0.5 && doseUnit === "Tablet") return "अर्धी";
    if (doseQuantity === 1) return "१";
    if (doseQuantity === 1.5) return "दीड";
    if (doseQuantity === 2) return "२";
    if (doseQuantity === 3) return "३";
    if (doseQuantity === 4) return "४";
    console.error("Dose quantity - " + doseQuantity + " for dose unit - " + doseUnit + " is not supported");
};

const dosageTimingToMarathi = function (complaint, times) {
    if (times === 1 || times === "1") return "दिवसातून एकदा";
    if (times === 2 || times === "2") return "दिवसातून दोन वेळा";
    if (times === 3 || times === "3") return "दिवसातून तीन वेळा";
    if (times === "Once Evening") return "रोज संध्याकाळी एकदा";
    if (times === "Special Instruction" && complaint === "Scabies") return "मानेपासून संपूर्ण अंगास अंघोळीनंतर लावणे व कपडे १ तास गरम पाण्यात उकळवीणे";
    if (times === "Special Instruction" && complaint === "Ring Worm") return "गजकर्णाच्या जागेवर लावण्यास सांगावे";
    if (times === "Special Instruction" && (complaint === "Vomiting" || complaint === "Diarrhoea" || complaint === "Giddiness")) return " पिण्यास सांगावे";
    console.error("Number of times " + times + " not supported yet");
};

const getDoseUnitMessage = function (daysPrescription) {
    if (daysPrescription["Dose Unit"] === "Spoon")
        return daysPrescription.Amount < 2 ? "चमचा" : "चमचे";
    else if (daysPrescription["Dose Unit"] === "ml")
        return "ml";
    return "टॅबलेट";
};

const getKeys = function (obj) {
    let keys = [];
    for (let key in obj) {
        keys.push(key);
    }
    return keys;
};

const getWeightRangeToCode = function (complaint, weight) {
    let weightRangeToCodeMap = complaintToWeightRangesToCodeMap[complaint];
    if (_.isNil(weightRangeToCodeMap))
        weightRangeToCodeMap = weightRangesToCode;

    return weightRangeToCodeMap.find(function (entry) {
        return entry.start <= weight && entry.end >= weight;
    });
};

const hasMalaria = function (encounter) {
    return new RuleCondition({programEncounter: encounter})
        .valueInEncounter("Paracheck")
        .containsAnyAnswerConceptName("Positive for PF", "Positive for PF and PV", "Positive for PV")
        .matches();
};

const getDecisions = function (encounter) {
    if (encounter.encounterType.name !== "Outpatient") return {};

    let {complaints, sex, age, weight} = getParameters(encounter);

    if (complaints.indexOf("Fever") === -1 && hasMalaria(encounter)) {
        complaints.push("Fever");
    }

    // Ordering Fever before all other complaints
    complaints = complaints.filter(function (item) {
        return item === 'Fever';
    }).concat(complaints.filter(function (item) {
        return item !== 'Fever'
    }));

    const potentiallyPregnant = (sex === "Female" && (age >= 16 && age <= 40));
    const pregnant = complaints.includes("Pregnancy");
    let decisions = [];
    let prescribedMedicines = [];

    let treatmentAdviceDecision = {name: "Treatment Advice", value: '', abnormal: true};

    // As of now, anything that goes into System Recommendations should be initialised
    // as an empty string and value should be set later. This is to allow addUpdateOrRemoveObs
    // in ConceptService to do its job
    let referralAdviceDecision = {name: "Referral Advice", value: ''};

    for (let complaintIndex = 0; complaintIndex < complaints.length; complaintIndex++) {
        let complaint = complaints[complaintIndex];
        let weightRangeToCode = getWeightRangeToCode(complaint, weight);

        let prescriptionSet;
        if (complaint === 'Chloroquine Resistant Malaria') // Don't generate any treatment advice
            continue;
        if ((potentiallyPregnant || pregnant) && ["Cough", "Boils", "Wound"].indexOf(complaint) !== -1) {
            prescriptionSet = treatmentByComplaintAndCode["Cifran-Special"];
        } else if (complaints.indexOf("Fever") === -1) {
            prescriptionSet = treatmentByComplaintAndCode[complaint];
        }

        let message = "";
        if (prescriptionSet) {
            let prescription = prescriptionSet[weightRangeToCode.code];
            if (_.isNil(prescription)) {
                throw "No prescription defined for " + complaint + " for weight: " + weight + ", calculated code: " + weightRangeToCode.code;
            }

            let dayTokens = getKeys(prescription);
            for (let token = 0; token < dayTokens.length; token++) {
                let firstToken = dayTokens[0];

                const daywisePrescription = dayTokens.length !== 1 && firstToken === "1";
                if (daywisePrescription) {
                    message += dayInMarathi[dayTokens[token]];
                    message += "\n";
                }

                for (let medicineIndex = 0; medicineIndex < prescription[dayTokens[token]].length; medicineIndex++) {
                    const daysPrescription = prescription[dayTokens[token]][medicineIndex];
                    if (prescribedMedicines.indexOf(daysPrescription.Medicine) === -1) {
                        prescribedMedicines.push(daysPrescription.Medicine);
                    } else if (prescribedMedicines.indexOf(daysPrescription.Medicine) !== -1 && !daywisePrescription) {
                        continue;
                    }

                    if (dayTokens.length === 1 && firstToken !== "1") {
                        if (firstToken === "3-5")
                            message += "३ किंवा ५ दिवसांसाठी";
                        else if (firstToken === "1-5")
                            message += "१ ते ५ दिवस";
                        else if (firstToken === "3")
                            message += "३ दिवस";
                        else if (firstToken === "2")
                            message += "२ दिवस";

                        message += "\n";
                    }

                    message += englishWordsToMarathi["" + daysPrescription.Medicine];
                    message += " ";
                    if (daysPrescription.Times !== "Special Instruction") {
                        message += doseQuantityToMarathi(daysPrescription.Amount, daysPrescription["Dose Unit"]);
                        message += " ";
                        message += getDoseUnitMessage(daysPrescription);
                        message += " ";
                    }
                    message += dosageTimingToMarathi(complaint, daysPrescription.Times);
                    message += " ";
                    message += englishWordsToMarathi[medicines[daysPrescription.Medicine].take];
                    message += "\n";
                }
            }
        }

        treatmentAdviceDecision.value = treatmentAdviceDecision.value === '' ? message : `${treatmentAdviceDecision.value}\n${message}`;

        if (complaint === "Fever") {
            treatmentAdviceDecision.value = `${treatmentAdviceDecision.value}\n${malariaPrescriptionMessage(encounter)}`;
        }

        if (weight >= 13 && complaint === "Fever") {
            if (treatmentAdviceDecision.value.indexOf("क्लोरोक्विन") !== -1 && treatmentAdviceDecision.value.indexOf("पॅरासिटामॉल") !== -1) {
                treatmentAdviceDecision.value = `${treatmentAdviceDecision.value}\nक्लोरोक्विन व पॅरासिटामॉल ही औषधे जेवल्यावर खायला सांगावी`;
            } else if (treatmentAdviceDecision.value.indexOf("पॅरासिटामॉल") !== -1) {
                treatmentAdviceDecision.value = `${treatmentAdviceDecision.value}\nपॅरासिटामॉल ही औषध जेवल्यावर खायला सांगावी`;
            }
        }
        else if (complaint === 'Vomiting') {
            treatmentAdviceDecision.value = `${treatmentAdviceDecision.value}\nउलटी असल्यास आधी औषध द्यावे व अर्ध्या तासांनंतर जेवण, दुध द्यावे व अर्ध्या तासांनंतर इतर औषधे द्यावीत`;
        } else if (complaint === 'Wound') {
            treatmentAdviceDecision.value = `${treatmentAdviceDecision.value}\nड्रेसिंग`;
        }
    }

    let referralAdviceNeeded = (pregnant && hasMalaria(encounter))
        || complaints.indexOf('Chloroquine Resistant Malaria') !== -1
        || complaints.indexOf('Other') !== -1

    if (referralAdviceNeeded)
        referralAdviceDecision.value = 'लोक बिरादरी दवाखाण्यात पुढील उपचाराकरिता पाठवावे';

    decisions.push(treatmentAdviceDecision, referralAdviceDecision);

    return {encounterDecisions: decisions};
};


function getParameters(encounter) {
    const params = {};
    params.complaints = encounter.findObservation('Complaint').getReadableValue();
    params.age = encounter.individual.getAgeInYears();
    params.sex = encounter.individual.gender.name;
    params.weight = encounter.getObservationValue('Weight');
    return params;
}

const validate = function (encounter, form) {
    if (encounter.encounterType.name !== "Outpatient") return [];

    const params = getParameters(encounter);
    const validationResults = [];

    for (let complaintIndex = 0; complaintIndex < params.complaints.length; complaintIndex++) {
        const complaint = params.complaints[complaintIndex];
        const weightRangeToCode = getWeightRangeToCode(complaint, params.weight);

        if (params.sex === 'Male' && complaint === 'Pregnancy') {
            addValidationError("maleCannotBePregnant");
        }
        if (complaint === 'Pregnancy' && params.age < 10) {
            addValidationError("lessThanTenCannotBePregnant");
        }
        if (complaint === 'Acidity' && params.weight < 13) {
            addValidationError("acidityMedsNotToBeGivenToChildren");
        }
    }

    function addValidationError(messageKey) {
        validationResults.push({success: false, messageKey: messageKey});
    }

    return validationResults;
};

const getFormElementsStatuses = (encounter, formElementGroup) => {
    let handler = new OPDFormHandler();
    return FormElementsStatusHelper.getFormElementsStatuses(handler, encounter, formElementGroup);
};

export {
    getDecisions,
    treatmentByComplaintAndCode,
    weightRangesToCode,
    getFormElementsStatuses,
    validate
};
