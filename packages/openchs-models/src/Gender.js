import ReferenceEntity from "./ReferenceEntity";

class Gender extends ReferenceEntity {
    static schema = {
        name: "Gender",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string"
        }
    };

    static fromResource(resource) {
        return ReferenceEntity.fromResource(resource, new Gender());
    }

    clone() {
        return super.clone(new Gender());
    }
}

export default Gender;