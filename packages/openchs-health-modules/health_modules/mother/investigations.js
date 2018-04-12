import ComplicationsBuilder from "../rules/complicationsBuilder";

const investigationAdvice = (enrolment, encounter) => {
    const investigations = ["Paracheck", "Hb", "Blood Sugar",
        "VDRL", "HIV/AIDS Test", "HbsAg", "Sickling Test", "Hb Electrophoresis",
        "Urine Albumin", "Urine Sugar"];
    const adviceBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Investigation Advice'
    });

    investigations.forEach((investigation) => {
        adviceBuilder.addComplication(investigation)
            .when.valueInEncounter(investigation).is.notDefined;
    });
    if (!adviceBuilder.hasComplications()) return null;
    const complications = adviceBuilder.getComplications();
    complications.value = `Missing Tests - ${complications.value.join(", ")}`;
    return complications
};

const generateInvestigationAdvice = (enrolment, encounter) => {
    return investigationAdvice(enrolment, encounter);
};

export default generateInvestigationAdvice;