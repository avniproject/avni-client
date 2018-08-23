import BaseEntity from "./BaseEntity";
import ResourceUtil from "./utility/ResourceUtil";
import General from "./utility/General";

export class ParentLocation extends BaseEntity {
    static schema = {
        name: "ParentLocation",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            location: 'AddressLevel',
            voided: {type: 'bool', default: false}
        }
    };

    static create({uuid, location, voided}) {
        return Object.assign(new ParentLocation(), {uuid, location, voided});
    }

    static fromResource(resource, entityService) {
        return ParentLocation.create({
            uuid: resource.uuid,
            location: entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "parentLocationUUID"), AddressLevel.schema.name),
            voided: !!resource.voided
        });
    }
}

class AddressLevel extends BaseEntity {
    static schema = {
        name: "AddressLevel",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string",
            level: "int",
            type: {type: 'string', optional: true},
            parentLocations: {type: 'list', objectType: 'ParentLocation'}
        }
    };

    static create({uuid, title, level, type, parentLocations = []}) {
        return Object.assign(new AddressLevel(), {uuid, name: title, level, type, parentLocations});
    }

    static fromResource(resource) {
        return AddressLevel.create(resource);
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        if (childEntityClass !== ParentLocation) {
            throw `${childEntityClass.name} not support by ${AddressLevel.schema.name}.associateChild()`;
        }
        let location = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "locationUUID"), AddressLevel.schema.name);
        location = General.pick(location, ["uuid"], ["parentLocations"]);
        BaseEntity.addNewChild(child, location.parentLocations);
        return location;
    }

    static merge = () => BaseEntity.mergeOn('parentLocations');

    getParentLocations() {
        return _.filter(this.parentLocations, parentLocation => !parentLocation.voided).map(parentLocation => parentLocation.location);
    }

    cloneForReference() {
        return AddressLevel.create({...this, title: this.name});
    }

    get translatedFieldValue() {
        return this.name;
    }
}

export default AddressLevel;