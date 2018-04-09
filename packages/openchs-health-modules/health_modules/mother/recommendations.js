import ComplicationsBuilder from "../rules/complicationsBuilder";

const institutionalDelivery = (enrolment) => {
    const medicalHistory = ["Hypertension", "Heart-related Diseases", "Diabetes",
        "Sickle Cell", "Epilepsy", "Renal Disease", "HIV/AIDS"];
    const pastComplications = [
        "Ante Partum Haemorrhage", "Intrauterine Growth Retardation", "Pre-term labour", "Prolonged labour",
        "Instrumental Delivery", "LSCS/C-section", "Intrauterine death", "Threatened abortion",
        "3 or more than 3 spontaneous abortions", "Still Birth", "Multiple Births", "Retained Placenta",
        "Post Partum Haemorrhage", "Intrapartum Death", "Neonatal death within first 28 days",
        "Congenital anomaly"
    ];
    const recommendationBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
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
        .or.when.valueInEnrolment("Obstetrics history").containsAnyAnswerConceptName(...pastComplications);

    recommendationBuilder.addComplication("Institutional ANC")
        .when.valueInRegistration("Medical history").containsAnyAnswerConceptName(...medicalHistory)
        .or.when.valueInEnrolment("Age of youngest child").asAge.is.lessThan(1)
        .or.when.valueInEnrolment("Obstetrics history").containsAnyAnswerConceptName("3 or more than 3 spontaneous abortions");

    return recommendationBuilder.getComplications()
};

const generateRecommendations = (enrolment) => {
    return institutionalDelivery(enrolment);
};

export default generateRecommendations;