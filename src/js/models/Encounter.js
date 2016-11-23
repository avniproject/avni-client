import General from "../utility/General";
import Observation from "./Observation";

class Encounter {
    static schema = {
        name: 'Encounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            encounterTypeUUID: 'string',
            encounterDateTime: 'date',
            individualUUID: 'string',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource) {
        const encounter = new Encounter();
        General.assignFields(resource, encounter, ["uuid"], ["encounterDateTime"], ["encounterTypeUUID", "individualUUID"]);
        var observations = [];
        resource["observations"].forEach((observationResource) => {
            var observation = new Observation();
            observation.conceptUUID = observationResource["conceptUUID"];
            observation.valueJSON = `${observationResource["value"]}`;
            observations.push(observation);
        });
        encounter.observations = observations;
        return encounter;
    }
}

export default Encounter;