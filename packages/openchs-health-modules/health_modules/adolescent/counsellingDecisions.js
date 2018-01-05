import ComplicationsBuilder from "../rules/complicationsBuilder";
import C from '../common';
import _ from 'lodash'

const encounterDecisions = (vulnerabilityEncounterDecisions, programEncounter) => {
    const complicationsBuilder = new ComplicationsBuilder({complicationsConcept: 'Adolescent Counselling Advice',
        programEncounter: programEncounter});


    let reasonsForSchoolDropoutVulnerability = C.findValue(vulnerabilityEncounterDecisions.encounterDecisions, "Reason for School Dropout Vulnerability");
    if(!_.isEmpty(reasonsForSchoolDropoutVulnerability) &&  reasonsForSchoolDropoutVulnerability.includes('Severe Anemia'))
        complicationsBuilder.addComplication("Severe Anemia Counselling");

    vulnerabilityEncounterDecisions.encounterDecisions.push(complicationsBuilder.getComplications());
    return vulnerabilityEncounterDecisions;
};

export {encounterDecisions}