import {complicationsBuilder as ComplicationsBuilder} from "rules-config/rules";
import {
    gestationalAge, isNormalAbdominalGirthIncrease, isNormalFundalHeightIncrease,
    isNormalWeightGain
} from "./utils";

const highRisk = (enrolment, encounter, today = new Date()) => {
    const pregnancyComplications = ["Excessive vomiting and inability to consume anything orally", "Severe Abdominal Pain", "Blurred vision",
        "Decreased Foetal movements", "Per vaginal bleeding", "PV leaking", "Morning Sickness", "Difficulty breathing", "Severe headache"];
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

    highRiskBuilder.addComplication("Foetal heart sound irregular")
        .when.valueInEncounter("Foetal Heart Sound").containsAnswerConceptName("Present and Irregular");

    highRiskBuilder.addComplication("Foetal heart sound absent")
        .when.valueInEncounter("Foetal Heart Sound").containsAnswerConceptName("Absent");

    highRiskBuilder.addComplication("Foetal heart rate irregular")
        .when.valueInEncounter("Foetal Heart Rate").is.lessThan(120)
        .or.when.valueInEncounter("Foetal Heart Rate").is.greaterThan(160);

    highRiskBuilder.addComplication("Irregular pulse")
        .when.valueInEncounter("Pulse").is.lessThan(60)
        .or.when.valueInEncounter("Pulse").is.greaterThan(100);

    highRiskBuilder.addComplication("Irregular Respiratory Rate")
        .when.valueInEncounter("Respiratory Rate").is.lessThan(12)
        .or.when.valueInEncounter("Respiratory Rate").is.greaterThan(20);

    highRiskBuilder.addComplication("High blood sugar")
        .when.valueInEncounter("Blood Sugar").is.greaterThanOrEqualTo(140);

    highRiskBuilder.addComplication("Abnormal Urine Sugar")
        .when.valueInEncounter("Urine Sugar").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");

    highRiskBuilder.addComplication("Multiple foetuses")
        .when.valueInEncounter("USG Scanning Report - Number of foetus").containsAnyAnswerConceptName("Two", "Three", "More than three");

    highRiskBuilder.addComplication("Abnormal Liquour")
        .when.valueInEncounter("USG Scanning Report - Liquour").containsAnyAnswerConceptName("Increased", "Decreased");

    highRiskBuilder.addComplication("Placenta Previa Present")
        .when.valueInEncounter("USG Scanning Report - Placenta Previa").containsAnyAnswerConceptName("Previa");
    
    highRiskBuilder.addComplication('Low BMI')
        .when.valueInEncounter('BMI').lessThan(18.5);

    highRiskBuilder.addComplication('High BMI')
        .when.valueInEncounter('BMI').greaterThan(24.9);

    return highRiskBuilder.getComplications()
};

const generateHighRiskConditionAdvice = (enrolment, encounter, today = new Date()) => {
    return highRisk(enrolment, encounter, today = new Date());
};

const getHighRiskConditionsInEnrolment = (enrolment) => {
    const highRiskBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        complicationsConcept: 'High Risk Conditions'
    });

    highRiskBuilder.addComplication("Puerperal sepsis")
        .when.valueInEnrolment("Obstetrics history").containsAnswerConceptName("Puerperal sepsis");

    highRiskBuilder.addComplication("Post abortion complications")
        .when.valueInEnrolment("Obstetrics history").containsAnswerConceptName("Post abortion complications");

    highRiskBuilder.addComplication("Under age pregnancy").when.age.is.lessThan(18);

    highRiskBuilder.addComplication("Old age pregnancy").when.age.is.greaterThan(30);

    highRiskBuilder.addComplication("Rh Negative Blood Group")
        .when.valueInRegistration("Blood group").containsAnyAnswerConceptName("AB-", "O-", "A-", "B-");

    return highRiskBuilder.getComplications();
};

const getHighRiskConditionsInDeliveryEncounter = (enrolment, encounter, today) => {
    const highRiskBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'High Risk Conditions'
    });
    highRiskBuilder.addComplication('Multiple Births')
        .when.valueInEncounter("Number of babies").is.greaterThan(1);

    return highRiskBuilder.getComplications();
};

export { generateHighRiskConditionAdvice as default, getHighRiskConditionsInEnrolment, getHighRiskConditionsInDeliveryEncounter };