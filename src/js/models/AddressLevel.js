import BaseEntity from "./BaseEntity";

class AddressLevel extends BaseEntity {
    static schema = {
        name: "AddressLevel",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string",
            level: "int",
            parentAddressLevel: {type: "AddressLevel", optional: true}
        }
    };

    static create(uuid, title, level, parentAddressLevel) {
        const addressLevel = new AddressLevel();
        addressLevel.uuid = uuid;
        addressLevel.name = title;
        addressLevel.level = level;
        addressLevel.parentAddressLevel = parentAddressLevel;
        return addressLevel;
    }

    static fromResource(resource) {
        return AddressLevel.create(resource["uuid"], resource["title"], resource["level"]);
    }

    cloneForReference() {
        const addressLevel = new AddressLevel();
        addressLevel.uuid = this.uuid;
        addressLevel.name = this.name;
        return addressLevel;
    }

    get translatedFieldValue() {
        return this.name;
    }
}

export default AddressLevel;