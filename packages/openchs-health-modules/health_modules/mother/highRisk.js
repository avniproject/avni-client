import ComplicationsBuilder from "../rules/complicationsBuilder";
import referralAdvice from "./referral";
import {
    gestationalAge, isNormalAbdominalGirthIncrease, isNormalFundalHeightIncrease,
    isNormalWeightGain
} from "./utils";

const highRisk = (enrolment, encounter, today = new Date()) => {
    const pregnancyComplications = ["Excessive vomiting and inability to consume anything orally", "Severe Abdominal Pain", "Blurring of vision",
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

    highRiskBuilder.addComplication("Multiple fetuses")
        .when.valueInEncounter("USG Scanning Report - Number of foetus").containsAnyAnswerConceptName("Two", "Three", "More than three");

    highRiskBuilder.addComplication("Abnormal Liquour")
        .when.valueInEncounter("USG Scanning Report - Liquour").containsAnyAnswerConceptName("Increased", "Decreased");

    highRiskBuilder.addComplication("Placenta Previa Present")
        .when.valueInEncounter("USG Scanning Report - Placenta Previa").containsAnyAnswerConceptName("Previa");

    highRiskBuilder.addComplication("Child born Underweight")
        .when.valueInEncounter("Birth Weight").lessThan(2);

    highRiskBuilder.addComplication("Did not cry soon after birth")
        .when.valueInEncounter("Cried soon after birth").containsAnswerConceptName("No");

    highRiskBuilder.addComplication("Not Breast-fed within 1 hour of birth")
        .when.valueInEncounter("Breast feeding within 1 hour of birth").containsAnswerConceptName("No");

    highRiskBuilder.addComplication("Colour of child is Pale or Blue")
        .when.valueInEncounter("Colour of child").containsAnswerConceptName("Blue/pale")

    highRiskBuilder.addComplication("Reflex Absent")
        .when.valueInEncounter("Reflex").containsAnswerConceptName("Absent")

    highRiskBuilder.addComplication("Muscle tone Absent/Flexed arms and legs")
        .when.valueInEncounter("Muscle tone").containsAnyAnswerConceptName("Absent", "Flexed arms and legs")
    
    highRiskBuilder.addComplication("Pulse <100 or > 160 bpm")
        .when.valueInEncounter("Pulse").lessThan(100)
        .or.when.valueInEncounter("Pulse").greaterThan(160);

    highRiskBuilder.addComplication("Low Temperature")
        .when.valueInEncounter("Temperature").lessThan(97.5)

    highRiskBuilder.addComplication("High Temperature")
        .when.valueInEncounter("Temperature").greaterThan(99.5);

    highRiskBuilder.addComplication("Respiratory Rate <30 or > 60 bpm")
        .when.valueInEncounter("Respiratory Rate").lessThan(30)
        .or.when.valueInEncounter("Respiratory Rate").greaterThan(60);

    highRiskBuilder.addComplication("Icterus Present")
        .when.valueInEncounter("Jaundice (Icterus)").containsAnswerConceptName("Present");

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

    highRiskBuilder.addComplication("Age < 18").when.age.is.lessThan(18);

    highRiskBuilder.addComplication("Age > 30").when.age.is.greaterThan(30);

    highRiskBuilder.addComplication("Rh Negative Blood Group")
        .when.valueInRegistration("Blood group").containsAnyAnswerConceptName("AB-", "O-", "A-", "B-");

    return highRiskBuilder.getComplications();
};

export { generateHighRiskConditionAdvice as default, getHighRiskConditionsInEnrolment };