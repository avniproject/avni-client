import ComplicationsBuilder from "../rules/complicationsBuilder";
import referralAdvice from "./referral";
import {
    gestationalAge, isNormalAbdominalGirthIncrease, isNormalFundalHeightIncrease,
    isNormalWeightGain
} from "./utils";

const highRisk = (enrolment, encounter, today = new Date()) => {
    const pregnancyComplications = ["Excessive vomiting and inability to consume anything orally", "Fever", "Severe Abdominal Pain", "Blurring of vision",
        "Decreased Foetal movements", "PV bleeding", "PV leaking", "Morning Sickness", "Difficulty breathing", "Severe headache"];
    const highRiskBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'High Risk Conditions'
    });

    pregnancyComplications.forEach((complication) => {
        highRiskBuilder.addComplication(complication)
            .when.valueInEncounter("Pregnancy complications").containsAnswerConceptName(complication);
    });

    highRiskBuilder.addComplication("Pedal Edema Present")
        .when.valueInEncounter("Pedal Edema").containsAnswerConceptName("Present");

    highRiskBuilder.addComplication("Pallor Present")
        .when.valueInEncounter("Pallor").containsAnswerConceptName("Present");

    highRiskBuilder.addComplication("Irregular weight gain")
        .whenItem(isNormalWeightGain(enrolment, encounter, today)).is.not.truthy;

    ["Flat", "Retracted"].forEach((nippleState) => {
        highRiskBuilder.addComplication(`${nippleState} Nipples`)
            .when.valueInEncounter("Breast Examination - Nipple").containsAnswerConceptName(nippleState);

    });

    highRiskBuilder.addComplication("Irregular fundal height increase")
        .whenItem(gestationalAge(enrolment, today)).greaterThan(24)
        .and.whenItem(isNormalFundalHeightIncrease(enrolment, encounter, today)).is.not.truthy;

    highRiskBuilder.addComplication("Irregular abdominal girth increase")
        .whenItem(gestationalAge(enrolment, today)).greaterThan(30)
        .and.whenItem(isNormalAbdominalGirthIncrease(enrolment, encounter, today)).is.not.truthy;

    return highRiskBuilder.getComplications()
};

const generateHighRiskConditionAdvice = (enrolment, encounter, today = new Date()) => {
    return highRisk(enrolment, encounter, today = new Date());
};

export default generateHighRiskConditionAdvice;