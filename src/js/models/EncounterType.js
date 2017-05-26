import ReferenceEntity from "./ReferenceEntity";

class EncounterType extends ReferenceEntity {
    static schema = {
        name: 'EncounterType',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static fromResource(resource) {
        return ReferenceEntity.fromResource(resource, new EncounterType());
    }

    clone() {
        return super.clone(new EncounterType());
    }
}

export default EncounterType;