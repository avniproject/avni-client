import ComplicationsBuilder from "../rules/complicationsBuilder";
import {
    gestationalAge, isNormalAbdominalGirthIncrease, isNormalFundalHeightIncrease,
    isNormalWeightGain
} from "./utils";
import _ from "lodash";

const immediateReferralAdvice = (enrolment, encounter, today = new Date()) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Refer to the hospital immediately for'
    });
    referralAdvice.addComplication("TB")
        .when.valueInEnrolment("Did she complete her TB treatment?").containsAnswerConceptName("No")
        .or.when.valueInEnrolment("Has she been taking her TB medication regularly?").containsAnswerConceptName("No");

    if (_.isEmpty(encounter)) return referralAdvice.getComplications();

    ["Excessive vomiting and inability to consume anything orally", "Severe Abdominal Pain", "Blurring of vision",
        "Decreased Foetal movements", "PV bleeding", "PV leaking"].forEach((complication) => {
        referralAdvice.addComplication(complication)
            .when.valueInEncounter("Pregnancy complications").containsAnswerConceptName(complication);
    });

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

const referralAdvice = (enrolment, encounter, today = new Date()) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Refer to the hospital for'
    });

    if (_.isEmpty(encounter)) return referralAdvice.getComplications();

    ["Flat", "Retracted"].forEach((nippleState) => {
        referralAdvice.addComplication(`${nippleState} Nipples`)
            .when.valueInEncounter("Breast Examination - Nipple").containsAnswerConceptName(nippleState);
    });

    referralAdvice.addComplication("Irregular weight gain")
        .whenItem(isNormalWeightGain(enrolment, encounter, today)).is.not.truthy;

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