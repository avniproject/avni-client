import Rule from "../rules/Rule";
import ComplicationsBuilder from "../rules/complicationsBuilder";
import {currentTrimester, gestationalAge} from "./utils";

@Rule("doxinatePrescription")
function doxinatePrescription(enrolment, encounter, decisions, today) {
    const treatmentBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        decisions: decisions,
        complicationsConcept: 'Treatment'
    });
    const trimester = currentTrimester(enrolment, encounter.encounterDateTime || today);

    treatmentBuilder.addComplication("Doxinate 1 OD/BD for 10 Days").when
        .valueInEncounter("Pregnancy complications").containsAnyAnswerConceptName("Morning Sickness", "Excessive vomiting and inability to consume anything orally")
        .and.whenItem(trimester).lessThan(3);

    return treatmentBuilder.getComplications()
}