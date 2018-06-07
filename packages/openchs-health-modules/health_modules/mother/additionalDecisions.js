import {TreatmentRule} from "../../../rules-config/src/rules/additional/Rule";
import ComplicationsBuilder from "../../../rules-config/src/rules/builders/AdditionalComplicationsBuilder";
import {currentTrimester, gestationalAge} from "./utils";

@TreatmentRule("1db85292-e64a-4327-a6c0-161c6fab1614", {
    description: "Prescribe Doxinate 1 OD/BD for 10 Days if the mother has morning sickness in the first or the second trimester"
})
function doxinatePrescription1(enrolment, encounter, decisions, today) {
    const treatmentBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        decisions: decisions,
        complicationsConcept: 'Treatment'
    });
    const trimester = currentTrimester(enrolment, encounter.encounterDateTime || today);

    treatmentBuilder.addComplication("Doxinate 1 OD/BD for 10 Days").when
        .valueInEncounter("Pregnancy complications")
        .containsAnyAnswerConceptName("Morning Sickness")
        .and.whenItem(trimester).lessThan(3);

    return treatmentBuilder.getComplications()
}

@TreatmentRule("28f4ed38-9fcb-4d91-9e2b-9caba9496303", {
    description: "Prescribe Doxinate 1 OD/BD for 10 Days if the mother has excessive vomiting in the first or the second trimester"
})
function doxinatePrescription2(enrolment, encounter, decisions, today) {
    const treatmentBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        decisions: decisions,
        complicationsConcept: 'Treatment'
    });
    const trimester = currentTrimester(enrolment, encounter.encounterDateTime || today);

    treatmentBuilder.addComplication("Doxinate 1 OD/BD for 10 Days").when
        .valueInEncounter("Pregnancy complications")
        .containsAnyAnswerConceptName("Excessive vomiting and inability to consume anything orally")
        .and.whenItem(trimester).lessThan(3);

    return treatmentBuilder.getComplications()
}

export {doxinatePrescription1, doxinatePrescription2};