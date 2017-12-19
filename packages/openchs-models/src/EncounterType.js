import ReferenceEntity from "./ReferenceEntity";
import General from "./utility/General";

class EncounterType extends ReferenceEntity {
    static schema = {
        name: 'EncounterType',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static create(name) {
        let encounterType = new EncounterType();
        encounterType.uuid = General.randomUUID();
        encounterType.name = name;
        return encounterType;
    }

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