import {complicationsBuilder as ComplicationsBuilder} from "rules-config/rules";
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

    referralAdvice.addComplication("Pulse <60 or > 100 bpm")
        .when.valueInEncounter("Child Pulse").lessThan(60)
        .or.when.valueInEncounter("Child Pulse").greaterThan(100);

    referralAdvice.addComplication("Low Temperature")
        .when.valueInEncounter("Child Temperature").lessThan(97.5);

    referralAdvice.addComplication("High Temperature")
        .when.valueInEncounter("Child Temperature").greaterThan(99.5);

    referralAdvice.addComplication("Respiratory Rate <30 or > 60 bpm")
        .when.valueInEncounter("Child Respiratory Rate").lessThan(30)
        .or.when.valueInEncounter("Child Respiratory Rate").greaterThan(60);

    referralAdvice.addComplication("Icterus present")
        .when.valueInEncounter("Jaundice (Icterus)").containsAnswerConceptName("Present");

    referralAdvice.addComplication("Urine not passed for more than 48 hours after birth")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Duration in hours between birth and first urination").greaterThan(48);

    referralAdvice.addComplication("Meconium not passed for more than 48 hours after birth")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Duration in hours between birth and meconium").greaterThan(48);

    referralAdvice.addComplication("Child PNC cry related complaints")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC cry related complaints").containsAnswerConceptName("Cries Continuously", "Poor cry");

    referralAdvice.addComplication("Child PNC feeding related complaints")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC feeding related complaints").containsAnswerConceptName("Not sucking milk at all", "Vomiting");

    referralAdvice.addComplication("Child PNC urination related complaints")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC urination related complaints").containsAnswerConceptName("No micturation", "Difficulty in micturation");

    referralAdvice.addComplication("Child PNC stool related complaints")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC stool related complaints").containsAnswerConceptName("Blood in stools", "Loose stools", "Not passing stools");

    referralAdvice.addComplication("Child PNC activity related complaints")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC activity related complaints").containsAnswerConceptName("Sluggish movements", "Not sucking milk at all", "Convulsions", "Slow activity / lethargic", "Unconscious");

    referralAdvice.addComplication("Fever/Chills")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Fever/Chills").containsAnswerConceptName("Yes");

    referralAdvice.addComplication("Child PNC eye problems")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC eye problems").containsAnswerConceptName("Redness of eyes", "Swollen eyelids", "Discharge from eyes", "Icterus present");

    referralAdvice.addComplication("Child PNC skin problems")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC skin problems").containsAnswerConceptName("Blue/pale", "Umbilical redness and or discharge", "Umbilical Abscess", "Rash", "Wrinkled Skin", "Sunken fontanelle", "Skin blisters")
        .or.when.valueInEncounter("Child PNC skin problems").containsAnswerConceptName("Rash").and.ageInDays.is.greaterThan(3);

    referralAdvice.addComplication("Child PNC breathing problems")
        .when.encounterType.equals("Child PNC")
        .when.valueInEncounter("Child PNC breathing problems").containsAnswerConceptName("Chest indrawing", "Breathing too fast", "Breathing too slow", "Grunting noises while breathing");

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