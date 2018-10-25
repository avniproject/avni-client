import {complicationsBuilder as ComplicationsBuilder} from "rules-config/rules";

const medicalHistory = [
    "Hypertension", "Heart-related Diseases", "Diabetes", "Sickle Cell", "Epilepsy", "Renal Disease",
    "HIV/AIDS", "Hepatitis B Positive"
];

const pastComplications = [
    "Ante Partum Haemorrhage", "Intrauterine Growth Retardation", "Pre-term labour", "Prolonged labour",
    "Instrumental Delivery", "LSCS/C-section", "Intrauterine death", "Threatened abortion",
    "3 or more than 3 spontaneous abortions", "Still Birth", "Multiple Births", "Retained Placenta",
    "Post Partum Haemorrhage (Excessive bleeding after delivery)", "Intrapartum Death", "Neonatal death within first 28 days",
    "Congenital anomaly", "Rh negative in the previous pregnancy"
];

const institutionalDelivery = (enrolment, encounter) => {
    const recommendationBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Recommendations'
    });
    recommendationBuilder.addComplication("Institutional Delivery").when.age.is.lessThan(18)
        .or.when.age.is.greaterThan(30)
        .or.when.valueInRegistration("Blood group").containsAnyAnswerConceptName("AB-", "O-", "A-", "B-")
        .or.when.valueInRegistration("Medical history").containsAnyAnswerConceptName(...medicalHistory)
        .or.when.valueInEnrolment("Height").is.lessThan(145)
        .or.when.valueInEnrolment("Gravida").is.equals(1)
        .or.when.valueInEnrolment("Gravida").is.greaterThanOrEqualTo(5)
        .or.when.valueInEnrolment("Age of youngest child").asAge.is.lessThan(1)
        .or.when.valueInEnrolment("Obstetrics history").containsAnyAnswerConceptName(...pastComplications)
        .or.when.valueInEnrolment("Infertility treatment").is.yes
        .or.when.valueInEncounter("Systolic").greaterThanOrEqualTo(140)
        .or.when.valueInEncounter("Diastolic").greaterThanOrEqualTo(90)
        .or.when.valueInEncounter("Urine Albumin").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4")
        .or.when.valueInEncounter("Urine Sugar").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4")
        .or.when.valueInEncounter("USG Scanning Report - Number of foetus").containsAnyAnswerConceptName("Two", "Three", "More than three")
        .or.when.valueInEncounter("USG Scanning Report - Liquour").containsAnyAnswerConceptName("Increased", "Decreased")
        .or.when.valueInEncounter("USG Scanning Report - Placenta Previa").containsAnyAnswerConceptName("Previa")
        .or.when.valueInEncounter("Foetal presentation").containsAnyAnswerConceptName("Transverse", "Breech")
        .or.when.valueInEncounter("VDRL").containsAnyAnswerConceptName("Positive")
        .or.when.valueInEncounter("HIV/AIDS Test").containsAnyAnswerConceptName("Positive")
        .or.when.valueInEncounter("HbsAg").containsAnyAnswerConceptName("Positive")
        .or.when.valueInEncounter("Sickling Test").containsAnyAnswerConceptName("Positive")
        .or.when.valueInEncounter("Hb Electrophoresis").containsAnyAnswerConceptName("SS")
    ;

    recommendationBuilder.addComplication("Institutional ANC")
        .when.valueInRegistration("Medical history").containsAnyAnswerConceptName(...medicalHistory)
        .or.when.valueInEnrolment("Age of youngest child").asAge.is.lessThan(1)
        .or.when.valueInEnrolment("Obstetrics history").containsAnyAnswerConceptName("3 or more than 3 spontaneous abortions")
        .or.when.valueInEncounter("Systolic").greaterThanOrEqualTo(140)
        .or.when.valueInEncounter("Diastolic").greaterThanOrEqualTo(90)
        .or.when.valueInEncounter("Urine Albumin").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4")
        .or.when.valueInEncounter("Urine Sugar").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4")
        .or.when.valueInEncounter("USG Scanning Report - Number of foetus").containsAnyAnswerConceptName("Two", "Three", "More than three")
        .or.when.valueInEncounter("USG Scanning Report - Liquour").containsAnyAnswerConceptName("Increased", "Decreased")
        .or.when.valueInEncounter("USG Scanning Report - Placenta Previa").containsAnyAnswerConceptName("Previa")
        .or.when.valueInEncounter("Foetal presentation").containsAnyAnswerConceptName("Transverse", "Breech")
    ;

    return recommendationBuilder.getComplications()
};

const institutionalDeliveryReasons = (enrolment, encounter) => {
    const reasonsBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Reason(s) for Institutional Delivery'
    });

    reasonsBuilder.addComplication("Under age pregnancy").when.age.is.lessThan(18);
    reasonsBuilder.addComplication("Old age pregnancy").when.age.is.greaterThan(30);
    reasonsBuilder.addComplication("Rh Negative Blood Group").when.valueInRegistration("Blood group").containsAnyAnswerConceptName("AB-", "O-", "A-", "B-");
    reasonsBuilder.addComplication("Medical history").when.valueInRegistration("Medical history").containsAnyAnswerConceptName(...medicalHistory);
    reasonsBuilder.addComplication("Short Stature").when.valueInEnrolment("Height").is.lessThan(145);
    reasonsBuilder.addComplication("Primigravida").when.valueInEnrolment("Gravida").is.equals(1);
    reasonsBuilder.addComplication("Grand Multipara").when.valueInEnrolment("Gravida").is.greaterThanOrEqualTo(5);
    reasonsBuilder.addComplication("Youngest child Less than 1 Year Old").when.valueInEnrolment("Age of youngest child").asAge.is.lessThan(1);
    reasonsBuilder.addComplication("Obstetrics history").when.valueInEnrolment("Obstetrics history").containsAnyAnswerConceptName(...pastComplications);
    reasonsBuilder.addComplication("Infertility treatment").when.valueInEnrolment("Infertility treatment").is.yes;
    reasonsBuilder.addComplication("Hypertension").when.valueInEncounter("Systolic").greaterThanOrEqualTo(140);
    reasonsBuilder.addComplication("Hypertension").when.valueInEncounter("Diastolic").greaterThanOrEqualTo(90);
    reasonsBuilder.addComplication("Abnormal Urine Albumin").when.valueInEncounter("Urine Albumin").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");
    reasonsBuilder.addComplication("Abnormal Urine Sugar").when.valueInEncounter("Urine Sugar").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");
    reasonsBuilder.addComplication("Multiple foetuses").when.valueInEncounter("USG Scanning Report - Number of foetus").containsAnyAnswerConceptName("Two", "Three", "More than three");
    reasonsBuilder.addComplication("USG Scanning Report - Liquour").when.valueInEncounter("USG Scanning Report - Liquour").containsAnyAnswerConceptName("Increased", "Decreased");
    reasonsBuilder.addComplication("USG Scanning Report - Placenta Previa").when.valueInEncounter("USG Scanning Report - Placenta Previa").containsAnyAnswerConceptName("Previa");
    reasonsBuilder.addComplication("Foetal presentation").when.valueInEncounter("Foetal presentation").containsAnyAnswerConceptName("Transverse", "Breech");
    reasonsBuilder.addComplication("VDRL Positive").when.valueInEncounter("VDRL").containsAnyAnswerConceptName("Positive");
    reasonsBuilder.addComplication("HIV/AIDS Positive").when.valueInEncounter("HIV/AIDS Test").containsAnyAnswerConceptName("Positive");
    reasonsBuilder.addComplication("Hepatitis B Positive").when.valueInEncounter("HbsAg").containsAnyAnswerConceptName("Positive");
    reasonsBuilder.addComplication("Sickling Positive").when.valueInEncounter("Sickling Test").containsAnyAnswerConceptName("Positive");
    reasonsBuilder.addComplication("Hb Electrophoresis").when.valueInEncounter("Hb Electrophoresis").containsAnyAnswerConceptName("SS");

    return reasonsBuilder.getComplications();
};

const institutionalANCReasons = (enrolment, encounter) => {
    const reasonsBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Reason(s) for Institutional ANC'
    });
    reasonsBuilder.addComplication("Medical history").when.valueInRegistration("Medical history").containsAnyAnswerConceptName(...medicalHistory);
    reasonsBuilder.addComplication("Youngest child Less than 1 Year Old").when.valueInEnrolment("Age of youngest child").asAge.is.lessThan(1);
    reasonsBuilder.addComplication("Obstetrics history").when.valueInEnrolment("Obstetrics history").containsAnyAnswerConceptName("3 or more than 3 spontaneous abortions");
    reasonsBuilder.addComplication("Hypertension").when.valueInEncounter("Systolic").greaterThanOrEqualTo(140);
    reasonsBuilder.addComplication("Hypertension").when.valueInEncounter("Diastolic").greaterThanOrEqualTo(90);
    reasonsBuilder.addComplication("Abnormal Urine Albumin").when.valueInEncounter("Urine Albumin").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");
    reasonsBuilder.addComplication("Abnormal Urine Sugar").when.valueInEncounter("Urine Sugar").containsAnyAnswerConceptName("Trace", "+1", "+2", "+3", "+4");
    reasonsBuilder.addComplication("Multiple foetuses").when.valueInEncounter("USG Scanning Report - Number of foetus").containsAnyAnswerConceptName("Two", "Three", "More than three");
    reasonsBuilder.addComplication("USG Scanning Report - Liquour").when.valueInEncounter("USG Scanning Report - Liquour").containsAnyAnswerConceptName("Increased", "Decreased");
    reasonsBuilder.addComplication("USG Scanning Report - Placenta Previa").when.valueInEncounter("USG Scanning Report - Placenta Previa").containsAnyAnswerConceptName("Previa");
    reasonsBuilder.addComplication("Foetal presentation").when.valueInEncounter("Foetal presentation").containsAnyAnswerConceptName("Transverse", "Breech");

    return reasonsBuilder.getComplications();
};

const generateRecommendations = (enrolment, encounter) => {
    return institutionalDelivery(enrolment, encounter);
};

const generateReasonsForRecommendations = (enrolment, encounter) => {
    return [institutionalDeliveryReasons(enrolment, encounter), institutionalANCReasons(enrolment, encounter)];
};

export {generateRecommendations, generateReasonsForRecommendations};
