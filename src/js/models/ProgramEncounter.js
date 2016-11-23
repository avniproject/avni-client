import General from "../utility/General";
import Observation from "./Observation";

class ProgramEncounter {
    static schema = {
        name: 'ProgramEncounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            followupTypeUUID: 'string',
            scheduledDateTime: 'date',
            actualDateTime: 'date',
            programEnrolmentUUID: 'string',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource) {
        const programEncounter = new ProgramEncounter();
        General.assignFields(resource, programEncounter, ["uuid"], ["scheduledDateTime", "actualDateTime"], ["followupTypeUUID", "programEnrolmentUUID"]);
        var observations = [];
        resource["observations"].forEach((observationResource) => {
            var observation = new Observation();
            observation.conceptUUID = observationResource["conceptUUID"];
            observation.valueJSON = `${observationResource["value"]}`;
            observations.push(observation);
        });
        programEncounter.observations = observations;
        return programEncounter;
    }
}

export default ProgramEncounter;