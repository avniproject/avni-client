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
        let entity = ReferenceEntity.fromResource(resource, new EncounterType());
        entity.uuid = resource.encounterTypeUUID;
        return entity;
    }

    clone() {
        return super.clone(new EncounterType());
    }
}

export default EncounterType;