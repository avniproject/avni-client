import General from "../utility/General";
import EncounterType from "./EncounterType";
import Individual from "./Individual";
import ResourceUtil from "../utility/ResourceUtil";

class Encounter {
    static schema = {
        name: 'Encounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            encounterType: 'EncounterType',
            encounterDateTime: 'date',
            individual: 'Individual',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource, entityService) {
        var encounterType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "encounterTypeUUID"), EncounterType.schema.name);
        var individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);

        var encounter = General.assignFields(resource, new Encounter(), ["uuid"], ["encounterDateTime"], ["observations"]);
        encounter.encounterType = encounterType;
        encounter.individual = individual;
        return encounter;
    }
}

export default Encounter;