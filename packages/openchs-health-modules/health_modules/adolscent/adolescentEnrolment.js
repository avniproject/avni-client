import ComplicationsBuilder from "../rules/complicationsBuilder";
import _ from "lodash";


const getDecisions = (programEnrolment, today) => {
    let enrolmentDecisions = [];
    const complicationsBuilder = new ComplicationsBuilder({
        programEnrolment: programEnrolment,
        complicationsConcept: 'Adolescent Vulnerabilities'
    });

    complicationsBuilder.addComplication("School dropout")
        .when.valueInEntireEnrolment("Parents expired?").containsAnyAnswerConceptName("Father", "Mother")
        .or
        .when.valueInEntireEnrolment("Father's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco")
        .or
        .when.valueInEntireEnrolment("Mother's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco")
        .or
        .when.valueInEntireEnrolment("Chronic sickness in family").containsAnyAnswerConceptName("Diabetes", "Hypertension", "TB", "Cancer", "Sicklecell Disease", "Other")
        .or
        .when.valueInEntireEnrolment("Number of family members").greaterThan(6);

    complicationsBuilder.addComplication("Addiction")
        .when.valueInEntireEnrolment("Parents expired?").containsAnyAnswerConceptName("Father", "Mother")
        .or
        .when.valueInEntireEnrolment("Father's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco")
        .or
        .when.valueInEntireEnrolment("Mother's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco");

    complicationsBuilder.addComplication("Addiction")
        .when.valueInEntireEnrolment("Number of family members").greaterThan(6);

    if (complicationsBuilder.hasComplications()) enrolmentDecisions.concat(complicationsBuilder.getComplications());
    return {enrolmentDecisions: enrolmentDecisions, encounterDecisions: [], registrationDecisions: []};
};

export {getDecisions};