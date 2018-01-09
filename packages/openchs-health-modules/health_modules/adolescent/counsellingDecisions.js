import ComplicationsBuilder from "../rules/complicationsBuilder";
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
            let reasonsForSchoolDropoutVulnerability = C.findValue(vulnerabilityEncounterDecisions.encounterDecisions,
                "Reason for School Dropout Vulnerability");

            if (reasonsForSchoolDropoutVulnerability.includes('No Parents / Single Parent')) {
                complicationsBuilder.addComplication("No Parents / Single Parent");
            }
            if (reasonsForSchoolDropoutVulnerability.includes('Malnutrition')) {
                complicationsBuilder.addComplication("Malnutrition");
            }
            if (reasonsForSchoolDropoutVulnerability.includes('Sickle Cell Anemia')) {
                complicationsBuilder.addComplication("Sickle Cell Anemia");
            }
            if (reasonsForSchoolDropoutVulnerability.includes('Severe Anemia')) {
                complicationsBuilder.addComplication("Severe Anemia");
            }
            if (reasonsForSchoolDropoutVulnerability.includes('Menstrual Disorder')) {
                complicationsBuilder.addComplication("Menstrual Disorder");
            }

        }
        if(vulnerabilities.includes("Addiction")){
            complicationsBuilder.addComplication("Addiction");
        }
        if(vulnerabilities.includes("Early Marriage")){
            complicationsBuilder.addComplication("Early Marriage");
        }
        if(vulnerabilities.includes("Early Pregnancy & RTI")){
            complicationsBuilder.addComplication("Early Pregnancy & RTI");
        }
        if(vulnerabilities.includes("Road Traffic Accident")){
            complicationsBuilder.addComplication("Road Traffic Accident");
        }
    }


    vulnerabilityEncounterDecisions.encounterDecisions.push(complicationsBuilder.getComplications());
    return vulnerabilityEncounterDecisions;
};

export {encounterDecisions}