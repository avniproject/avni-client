import General from "../utility/General";

class EncounterType {
    static schema = {
        name: 'EncounterType',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static fromResource(resource) {
        return General.assignFields(resource, new EncounterType(), ["uuid", "name"]);
    }
}

export default EncounterType;