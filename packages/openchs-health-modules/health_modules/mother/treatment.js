import ComplicationsBuilder from "../../../rules-config/src/rules/builders/complicationsBuilder";
import {currentTrimester, gestationalAge} from "./utils";

const treatment = (enrolment, encounter, today) => {
    const trimester = currentTrimester(enrolment, encounter.encounterDateTime || today);
    const gestationalAgeInWeeks = gestationalAge(enrolment, encounter.encounterDateTime || today);
    const treatmentBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Treatment'
    });
    treatmentBuilder.addComplication("Doxinate 1 OD/BD for 10 Days").when
        .valueInEncounter("Pregnancy complications").containsAnyAnswerConceptName("Morning Sickness", "Excessive vomiting and inability to consume anything orally")
        .and.whenItem(trimester).lessThan(3);

    treatmentBuilder.addComplication("Folic acid (1 OD)")
        .whenItem(trimester).equals(1);

    treatmentBuilder.addComplication("Ferrous Sulphate (100mg)")
        .when.valueInEncounter("Hb").greaterThanOrEqualTo(11)
        .and.whenItem(trimester).equalsOneOf(2, 3);

    treatmentBuilder.addComplication("Ferrous Sulphate (200mg)")
        .when.valueInEncounter("Hb").greaterThanOrEqualTo(8)
        .and.when.valueInEncounter("Hb").lessThan(11)
        .and.whenItem(trimester).equalsOneOf(2, 3);

    treatmentBuilder.addComplication("Calcium 1g/day")
        .whenItem(trimester).equalsOneOf(2, 3);

    treatmentBuilder.addComplication("Aspirin 75mg once a day")
        .whenItem(gestationalAgeInWeeks).greaterThanOrEqualTo(13)
        .and.whenItem(gestationalAgeInWeeks).lessThan(36);

    return treatmentBuilder.getComplications()
};

const generateTreatment = (enrolment, encounter, today = new Date()) => {
    return treatment(enrolment, encounter, today);
};

export default generateTreatment;