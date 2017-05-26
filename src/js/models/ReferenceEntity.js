import General from "../utility/General";

class ReferenceEntity {
    static fromResource(resource, entity) {
        return General.assignFields(resource, entity, ["uuid", "name"]);
    }

    clone(newEntity) {
        newEntity.uuid = this.uuid;
        newEntity.name = this.name;
        return newEntity;
    }

    get translatedFieldValue() {
        return this.name;
    }
}

export default ReferenceEntity;