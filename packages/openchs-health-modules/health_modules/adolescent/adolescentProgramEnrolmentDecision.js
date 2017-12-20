import ComplicationsBuilder from "../rules/complicationsBuilder";
import EnrolmentFormHandler from "./formFilters/EnrolmentFormHandler";
import FormFilterHelper from "../rules/FormFilterHelper";
import RuleCondition from "../rules/RuleCondition";


const getDecisions = (programEnrolment, today) => {
    let enrolmentDecisions = [];

    function getComplicationsBuilderFor(concept){
        return new ComplicationsBuilder({
                programEnrolment: programEnrolment,
                complicationsConcept: concept
            }
        );
    }

    const vulnerabilitiesBuilder = getComplicationsBuilderFor('Adolescent Vulnerabilities');
    const schoolDropoutVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for School Dropout Vulnerability');
    const addictionVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for Addiction Vulnerability');
    const earlyMarriageVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for Early Marriage Vulnerability');
    const earlyPregnancyVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for Early Pregnancy Vulnerability');
    const poorPerformanceInSchoolVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for Poor Performance in School Vulnerability');
    const malnutritionVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for Malnutrition Vulnerability');
    const hivVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for HIV Vulnerability');
    const stdVulnerabilityReasonsBuilder = getComplicationsBuilderFor('Reason for STD Vulnerability');

    function reasonsBuilderFor(vulnerability){
        switch(vulnerability){
            case 'School dropout':
                return schoolDropoutVulnerabilityReasonsBuilder;
            case 'Addiction':
                return addictionVulnerabilityReasonsBuilder;
            case 'Early Marriage':
                return earlyMarriageVulnerabilityReasonsBuilder;
            case 'Early Pregnancy':
                return earlyPregnancyVulnerabilityReasonsBuilder;
            case 'Poor Performance in School':
                return poorPerformanceInSchoolVulnerabilityReasonsBuilder;
            case 'Malnutrition':
                return malnutritionVulnerabilityReasonsBuilder;
            case 'HIV':
                return hivVulnerabilityReasonsBuilder;
            case 'STD':
                return stdVulnerabilityReasonsBuilder;
        }
    }

    function addVulnerabilityAndReason (vulnerability, reason) {
        vulnerabilitiesBuilder.addComplication(vulnerability);
        reasonsBuilderFor(vulnerability).addComplication(reason);
    }

    let analyseAndAddSchoolDropoutVulnerabilityAndReasons = function () {
        let ruleCondition = new RuleCondition({programEnrolment: programEnrolment});
        ruleCondition
            .when.valueInEnrolment("Parents' life status").containsAnyAnswerConceptName("Only Father Alive", "Only Mother Alive", "Both Expired", "Separated")
            .then(() => {
                addVulnerabilityAndReason("School dropout", "Single or No Parents");
            });

        ruleCondition.when.valueInEnrolment("Addiction Details").containsAnyAnswerConceptName("Alcohol", "Tobacco")
            .then(() => {
                addVulnerabilityAndReason("School dropout", "Adolescent Addiction");
            });

        ruleCondition.when.valueInEnrolment("Chronic sickness in family").containsAnyAnswerConceptName("Diabetes", "Hypertension", "TB", "Cancer", "Sicklecell Disease", "Other")
            .then(() => {
                addVulnerabilityAndReason("School dropout", "Chronic sickness in family");
            });

        ruleCondition.when.valueInEnrolment("Number of family members").greaterThan(6)
            .then(() => {
                addVulnerabilityAndReason("School dropout", "Family Size > 6")
            });

        ruleCondition
            .when.valueInEnrolment("Addiction Details").containsAnyAnswerConceptName("Tobacco", "Tobacco", "Both")
            .then(() => {
                addVulnerabilityAndReason("School dropout", "Adolescent Addiction");
            });

        return ruleCondition;
    };

    let analyseAndAddAddictionVulnerabilityAndReasons = function () {
        let ruleCondition = new RuleCondition({programEnrolment: programEnrolment});
        ruleCondition
            .when.valueInEnrolment("Father's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco")
            .and.valueInEnrolment("Mother's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco")
            .then(() => {
                addVulnerabilityAndReason("Addiction", "Parents' Addiction")
            });

        // ruleCondition
        //     .when.valueInEnrolment("Are friends addicted?").containsAnyAnswerConceptName("Yes")
        //     .then(() => {
        //         addVulnerabilityAndReason("Addiction", "Friends Addiction");
        //         });
        //
        // ruleCondition
        //     .when.valueInEnrolment("Addiction Details").containsAnyAnswerConceptName("Alcohol", "Tobacco", "Both")
        //     .then(() => {
        //         addVulnerabilityAndReason("Addiction", "Adolescent Addiction");
        //         });
    };

    let analyseAndAddMalnutritionVulnerabilityAndReasons = function () {
        let ruleCondition = new RuleCondition({programEnrolment: programEnrolment});

        ruleCondition.when.valueInEnrolment("Number of family members").greaterThan(6)
            .then(() => {
                addVulnerabilityAndReason("Malnutrition", "Family Size > 6")
            });


    };

    analyseAndAddSchoolDropoutVulnerabilityAndReasons();
    analyseAndAddAddictionVulnerabilityAndReasons();
    analyseAndAddMalnutritionVulnerabilityAndReasons();

    enrolmentDecisions.push(vulnerabilitiesBuilder.getComplications());
    enrolmentDecisions.push(schoolDropoutVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(addictionVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(earlyMarriageVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(earlyPregnancyVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(malnutritionVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(poorPerformanceInSchoolVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(hivVulnerabilityReasonsBuilder.getComplications());
    enrolmentDecisions.push(stdVulnerabilityReasonsBuilder.getComplications());


    return {enrolmentDecisions: enrolmentDecisions, encounterDecisions: [], registrationDecisions: []};
};

const filterFormElements = (programEnrolment, formElementGroup) => {
    let handler = new EnrolmentFormHandler();
    return FormFilterHelper.filterFormElements(handler, programEnrolment, formElementGroup);
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {


};

export {getDecisions, getNextScheduledVisits, filterFormElements};