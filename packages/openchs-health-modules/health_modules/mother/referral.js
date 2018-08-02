import {complicationsBuilder as ComplicationsBuilder} from "rules-config/rules";
import {
    gestationalAge, isNormalAbdominalGirthIncrease, isNormalFundalHeightIncrease,
    isNormalWeightGain
} from "./utils";
import _ from "lodash";
import {isBelowNormalWeightGain, isAbsoluteMaxWeightGain} from "./calculations";

const immediateReferralAdvice = (enrolment, encounter, today = new Date()) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Refer to the hospital immediately for'
    });

    if (encounter && encounter.encounterType.name === "PNC")
        return pncImmediateReferralAdvice(referralAdvice);

    referralAdvice.addComplication("TB")
        .when.valueInEnrolment("Did she complete her TB treatment?").containsAnswerConceptName("No")
        .or.when.valueInEnrolment("Has she been taking her TB medication regularly?").containsAnswerConceptName("No");

    if (_.isEmpty(encounter)) return referralAdvice.getComplications();

    ["Excessive vomiting and inability to consume anything orally in last 24 hours", "Severe Abdominal Pain", "Blurred vision",
        "Decreased Foetal movements", "Per vaginal bleeding", "PV leaking"].forEach((complication) => {
        referralAdvice.addComplication(complication)
            .when.valueInEncounter("Pregnancy complications").containsAnswerConceptName(complication);
    });

    referralAdvice.addComplication("Irregular weight gain")
        .whenItem(isAbsoluteMaxWeightGain(enrolment, encounter, today)).is.truthy;

    referralAdvice.addComplication("Convulsions")
        .when.valueInEncounter("Has she been having convulsions?").containsAnswerConceptName("Present");

    referralAdvice.addComplication("Jaundice")
        .when.valueInEncounter("Jaundice (Icterus)").containsAnswerConceptName("Present");

    referralAdvice.addComplication("Foetal movements absent")
        .when.valueInEncounter("Foetal movements").containsAnswerConceptName("Absent");

    referralAdvice.addComplication("Foetal movements reduced")
        .when.valueInEncounter("Foetal movements").containsAnswerConceptName("Reduced");

    referralAdvice.addComplication("Foetal heart sound irregular")
        .when.valueInEncounter("Foetal Heart Sound").containsAnswerConceptName("Present and Irregular");

    referralAdvice.addComplication("Foetal heart sound absent")
        .when.valueInEncounter("Foetal Heart Sound").containsAnswerConceptName("Absent");

    referralAdvice.addComplication("Foetal heart rate irregular")
        .when.valueInEncounter("Foetal Heart Rate").is.lessThan(120)
        .or.when.valueInEncounter("Foetal Heart Rate").is.greaterThan(160);

    referralAdvice.addComplication("Hypertension")
        .when.valueInEncounter("Systolic").greaterThanOrEqualTo(140)
        .or.when.valueInEncounter("Diastolic").greaterThanOrEqualTo(90);

    referralAdvice.addComplication("Fever")
        .when.valueInEncounter("Temperature").greaterThan(99);

    referralAdvice.addComplication("Abnormal Paracheck")
        .when.valueInEncounter("Paracheck").containsAnyAnswerConceptName("Positive for PF", "Positive for PF and PV", "Positive for PV");

    referralAdvice.addComplication("Abnormal Hb")
        .when.valueInEncounter("Hb").lessThan(8);

    referralAdvice.addComplication("High blood sugar")
        .when.valueInEncounter("Blood Sugar").greaterThanOrEqualTo(140);

    referralAdvice.addComplication("Abnormal Hb Electrophoresis")
        .when.valueInEncounter("Hb Electrophoresis").containsAnyAnswerConceptName("SS");

    referralAdvice.addComplication("Abnormal Urine Albumin")
        .when.valueInEncounter("Urine Albumin").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");

    referralAdvice.addComplication("Abnormal Urine Sugar")
        .when.valueInEncounter("Urine Sugar").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");

    return referralAdvice.getComplications();
};

const pncImmediateReferralAdvice = (referralAdviceObj) => {
    referralAdviceObj.addComplication("Hypertension")
        .when.valueInEncounter("Systolic").greaterThanOrEqualTo(140)
        .or.when.valueInEncounter("Diastolic").greaterThanOrEqualTo(90);

    referralAdviceObj.addComplication("Fever")
        .when.valueInEncounter("Temperature").greaterThan(99);

    referralAdviceObj.addComplication("Abnormal Hb")
        .when.valueInEncounter("Hb % Level").lessThan(8);

    referralAdviceObj.addComplication("Post-Partum Haemorrhage symptoms")
        .when.valueInEncounter("Post-Partum Haemorrhage symptoms")
        .containsAnyAnswerConceptName("Difficulty breathing", "Bad headache", "Blurred vision");

    referralAdviceObj.addComplication("Abdominal problems")
        .when.valueInEncounter("Any abdominal problems")
        .containsAnyAnswerConceptName("Uterus is soft or tender", "Abdominal pain");

    referralAdviceObj.addComplication("Vaginal problems")
        .when.valueInEncounter("Any vaginal problems")
        .containsAnyAnswerConceptName("Heavy bleeding per vaginum", "Bad-smelling lochia", "Infected perineum suture");

    referralAdviceObj.addComplication("Urination difficulties")
        .when.valueInEncounter("Any difficulties with urinating")
        .containsAnyAnswerConceptName("Difficulty passing urine", "Burning Urination");

    referralAdviceObj.addComplication("Breast-related problems")
        .when.valueInEncounter("Any breast problems")
        .containsAnyAnswerConceptName("Cracked Nipple", "Nipple hardness", "Breast hardness", "Agalactorrhea- no or insufficient lactation", "Breast engorgement", "Breast abcess");

    referralAdviceObj.addComplication("Cesarean incision problems")
        .when.valueInEncounter("How is the Cesarean incision area")
        .containsAnyAnswerConceptName("Indurated", "Looks red", "Filled with pus");

    referralAdviceObj.addComplication("Feeling hot or has chills")
        .when.valueInEncounter("Does feel hot or have the chills")
        .containsAnswerConceptName("Yes");

    referralAdviceObj.addComplication("Convulsions")
        .when.valueInEncounter("Convulsions")
        .containsAnswerConceptName("Present");

    return referralAdviceObj.getComplications();
};

const pncReferralAdvice = (referralAdviceObj) => {
    referralAdviceObj.addComplication("Post-Partum Depression Symptoms")
        .when.valueInEncounter("Post-Partum Depression Symptoms")
        .containsAnyAnswerConceptName("Insomnia", "Irritability", "Loss of appetite", "Weakness");

    referralAdviceObj.addComplication("Low Pulse")
        .when.valueInEncounter("Pulse").is.lessThan(60);

    referralAdviceObj.addComplication("High Pulse")
        .when.valueInEncounter("Pulse").is.greaterThan(100);

    referralAdviceObj.addComplication("Low Respiratory Rate")
        .when.valueInEncounter("Respiratory Rate").is.lessThan(12);

    referralAdviceObj.addComplication("High Respiratory Rate")
        .when.valueInEncounter("Respiratory Rate").is.greaterThan(20);

    referralAdviceObj.addComplication("Not using contraceptives")
        .valueInEncounter("Is the mother using any contraceptive method?")
        .containsAnswerConceptName("No");

    return referralAdviceObj.getComplications();
};

const referralAdvice = (enrolment, encounter, today = new Date()) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Refer to the hospital for'
    });

    if (_.isEmpty(encounter)) return referralAdvice.getComplications();

    if (encounter && encounter.encounterType.name === "PNC")
        return pncReferralAdvice(referralAdvice);

    ["Flat", "Retracted"].forEach((nippleState) => {
        referralAdvice.addComplication(`${nippleState} Nipples`)
            .when.valueInEncounter("Breast Examination - Nipple").containsAnswerConceptName(nippleState);
    });

    referralAdvice.addComplication("Irregular weight gain")
        .whenItem(isBelowNormalWeightGain(enrolment, encounter, today)).is.truthy;

    referralAdvice.addComplication("Irregular fundal height increase")
        .whenItem(gestationalAge(enrolment, today)).greaterThan(24)
        .and.whenItem(isNormalFundalHeightIncrease(enrolment, encounter, today)).is.not.truthy;

    referralAdvice.addComplication("Irregular abdominal girth increase")
        .whenItem(gestationalAge(enrolment, today)).greaterThan(30)
        .and.whenItem(isNormalAbdominalGirthIncrease(enrolment, encounter, today)).is.not.truthy;

    referralAdvice.addComplication("Abdominal pain")
        .when.valueInEncounter("Complaint").containsAnswerConceptName("Abdominal pain");

    referralAdvice.addComplication("Per vaginal bleeding")
        .when.valueInEncounter("Complaint").containsAnswerConceptName("Per vaginal bleeding");

    referralAdvice.addComplication("Fever")
        .when.valueInEncounter("Complaint").containsAnswerConceptName("Fever")
        .and.valueInEncounter("Place of abortion").containsAnswerConceptName("Home");

    return referralAdvice.getComplications();
};

export {referralAdvice, immediateReferralAdvice};