import BaseEntity from "./BaseEntity";
import ResourceUtil from "./utility/ResourceUtil";
import General from "./utility/General";

export class LocationMapping extends BaseEntity {
    static schema = {
        name: "LocationMapping",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            parent: 'AddressLevel',
            child: 'AddressLevel',
            voided: {type: 'bool', default: false}
        }
    };

    static create({uuid, parent, child, voided}) {
        return Object.assign(new LocationMapping(), {uuid, parent, child, voided});
    }

    static fromResource(resource, entityService) {
        return LocationMapping.create({
            uuid: resource.uuid,
            parent: entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "parentLocationUUID"), AddressLevel.schema.name),
            child: entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "locationUUID"), AddressLevel.schema.name),
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
            level: "double",
            type: {type: 'string', optional: true},
            locationMappings: {type: 'list', objectType: 'LocationMapping'}
        }
    };

    static create({uuid, title, level, type, locationMappings = []}) {
        return Object.assign(new AddressLevel(), {uuid, name: title, level, type, locationMappings});
    }

    static fromResource(resource) {
        return AddressLevel.create(resource);
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        if (childEntityClass !== LocationMapping) {
            throw `${childEntityClass.name} not support by ${AddressLevel.schema.name}.associateChild()`;
        }
        let location = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "locationUUID"), AddressLevel.schema.name);
        location = General.pick(location, ["uuid"], ["locationMappings"]);
        BaseEntity.addNewChild(child, location.locationMappings);
        return location;
    }

    static merge = () => BaseEntity.mergeOn('locationMappings');

    getParentLocations() {
        return _.filter(this.locationMappings, locationMapping => !locationMapping.voided).map(locationMapping => locationMapping.parent);
    }

    cloneForReference() {
        return AddressLevel.create({...this, title: this.name});
    }

    get translatedFieldValue() {
        return this.name;
    }
}

export default AddressLevel;