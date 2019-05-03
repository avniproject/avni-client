import General from "./utility/General";
import ReferenceEntity from "./ReferenceEntity";

class IdentifierSource extends ReferenceEntity {
    static schema = {
        name: 'IdentifierSource',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
        }
    };

    static fromResource(resource) {
        return ReferenceEntity.fromResource(resource, new IdentifierSource());
    }

    static create(name) {
        let identifierSource = new IdentifierSource();
        identifierSource.uuid = General.randomUUID();
        identifierSource.name = name;
        return identifierSource;
    }

    clone() {
        let identifierSource = new IdentifierSource();
        identifierSource.uuid = this.uuid;
        identifierSource.name = this.name;
        return identifierSource;
    }
}

export default IdentifierSource;