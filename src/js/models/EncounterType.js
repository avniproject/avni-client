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

    clone() {
        const encounterType = new EncounterType();
        encounterType.uuid = this.uuid;
        encounterType.name = this.name;
        return encounterType;
    }
}

export default EncounterType;