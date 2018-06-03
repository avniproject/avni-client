import ComplicationsBuilder from "../../../rules-config/src/rules/builders/complicationsBuilder";
import C from '../common';
import _ from 'lodash'

const encounterDecisions = (vulnerabilityEncounterDecisions, programEncounter) => {
    const complicationsBuilder = new ComplicationsBuilder({
        complicationsConcept: 'Adolescent Counselling Advice',
        programEncounter: programEncounter
    });


    let vulnerabilities = C.findValue(vulnerabilityEncounterDecisions.encounterDecisions,
        "Adolescent Vulnerabilities");

    if (!_.isEmpty(vulnerabilities)) {
        if (vulnerabilities.includes("School dropout")) {
            complicationsBuilder.addComplication("No Parents / Single Parent")
                .when.valueInEncounter("Reason for School Dropout Vulnerability").containsAnswerConceptName('No Parents / Single Parent');

            complicationsBuilder.addComplication("Malnutrition")
                .when.valueInEncounter("Reason for School Dropout Vulnerability").containsAnswerConceptName('Malnutrition');

            complicationsBuilder.addComplication("Sickle Cell Anemia")
                .when.valueInEncounter("Reason for School Dropout Vulnerability").containsAnswerConceptName('Sickle Cell Anemia');

            complicationsBuilder.addComplication("Severe Anemia")
                .when.valueInEncounter("Reason for School Dropout Vulnerability").containsAnswerConceptName('Severe Anemia');

            complicationsBuilder.addComplication("Menstrual Disorder")
                .when.valueInEncounter("Reason for School Dropout Vulnerability").containsAnswerConceptName('Menstrual Disorder')
                .and.valueInEncounter("Counselling for Menstrual Disorder Done").containsAnswerConceptName("No");
        }

        complicationsBuilder.addComplication("Addiction")
            .when.valueInEncounter("Adolescent Vulnerabilities").containsAnswerConceptName("Addiction");
        complicationsBuilder.addComplication("Early Marriage")
            .when.valueInEncounter("Adolescent Vulnerabilities").containsAnswerConceptName("Early Marriage");
        complicationsBuilder.addComplication("Early Pregnancy & RTI")
            .when.valueInEncounter("Adolescent Vulnerabilities").containsAnswerConceptName("Early Pregnancy & RTI");
        complicationsBuilder.addComplication("Road Traffic Accident")
            .when.valueInEncounter("Adolescent Vulnerabilities").containsAnswerConceptName("Road Traffic Accident");
    }


    vulnerabilityEncounterDecisions.encounterDecisions.push(complicationsBuilder.getComplications());
    return vulnerabilityEncounterDecisions;
};

export {encounterDecisions}