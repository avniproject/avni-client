import ComplicationsBuilder from "../rules/complicationsBuilder";
import _ from "lodash";

const immediateReferralAdvice = (enrolment, encounter, today = new Date()) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Refer to the hospital immediately for'
    });

    referralAdvice.addComplication("Child born Underweight")
        .when.valueInEncounter("Birth Weight").lessThan(2);

    referralAdvice.addComplication("Did not cry soon after birth")
        .when.valueInEncounter("Cried soon after birth").containsAnswerConceptName("No");

    referralAdvice.addComplication("Colour of child is Pale or Blue")
        .when.valueInEncounter("Colour of child").containsAnswerConceptName("Blue/pale");

    referralAdvice.addComplication("Reflex Absent")
        .when.valueInEncounter("Reflex").containsAnswerConceptName("Absent");

    referralAdvice.addComplication("Muscle tone Absent/Flexed arms and legs")
        .when.valueInEncounter("Muscle tone").containsAnyAnswerConceptName("Absent", "Flexed arms and legs");

    referralAdvice.addComplication("Pulse <100 or > 160 bpm")
        .when.valueInEncounter("Child Pulse").lessThan(100)
        .or.when.valueInEncounter("Child Pulse").greaterThan(160);

    referralAdvice.addComplication("Low Temperature")
        .when.valueInEncounter("Child Temperature").lessThan(97.5);

    referralAdvice.addComplication("High Temperature")
        .when.valueInEncounter("Child Temperature").greaterThan(99.5);

    referralAdvice.addComplication("Respiratory Rate <30 or > 60 bpm")
        .when.valueInEncounter("Child Respiratory Rate").lessThan(30)
        .or.when.valueInEncounter("Child Respiratory Rate").greaterThan(60);

    referralAdvice.addComplication("Icterus Present")
        .when.valueInEncounter("Jaundice (Icterus)").containsAnswerConceptName("Present");

    return referralAdvice.getComplications();
};

const referralAdvice = (enrolment, encounter, today = new Date()) => {
    const referralAdvice = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Refer to the hospital for'
    });

    if (_.isEmpty(encounter)) return referralAdvice.getComplications();

    referralAdvice.addComplication("Not Breast-fed within 1 hour of birth")
        .when.valueInEncounter("Breast feeding within 1 hour of birth").containsAnswerConceptName("No");

    return referralAdvice.getComplications();
};

export {referralAdvice, immediateReferralAdvice};