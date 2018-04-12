import ComplicationsBuilder from "../rules/complicationsBuilder";
import {currentTrimester} from "./utils";

const investigationAdvice = (enrolment, encounter, today = new Date()) => {
    const investigations = [["Paracheck", [1, 2, 3]], ["Hb", [1, 2, 3]], ["Blood Sugar", [1, 2, 3]],
        ["VDRL", [1]], ["HIV/AIDS Test", [1]], ["HbsAg", [1]], ["Sickling Test", [1]], ["Hb Electrophoresis", [1]],
        ["Urine Albumin", [1, 2, 3]], ["Urine Sugar", [1, 2, 3]]];
    const adviceBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Investigation Advice'
    });

    investigations.forEach(([investigation, applicableTrimesters]) => {
        adviceBuilder.addComplication(investigation)
            .when.valueInEncounter(investigation).is.notDefined
            .and.whenItem(applicableTrimesters.indexOf(currentTrimester(enrolment, today))).greaterThan(-1);
    });
    if (!adviceBuilder.hasComplications()) return null;
    const complications = adviceBuilder.getComplications();
    complications.value = `Missing Tests - ${complications.value.join(", ")}`;
    complications.abnormal = true;
    return complications
};

const generateInvestigationAdvice = (enrolment, encounter, today) => {
    return investigationAdvice(enrolment, encounter, today);
};

export default generateInvestigationAdvice;