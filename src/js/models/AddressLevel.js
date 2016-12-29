import _ from "lodash";
import BaseEntity from "./BaseEntity";

class AddressLevel extends BaseEntity {
    static schema = {
        name: "AddressLevel",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            title: "string",
            level: "int",
            parentAddressLevel: {type: "AddressLevel", optional: true}
        }
    };

    static create(uuid, title, level, parentAddressLevel) {
        const addressLevel = new AddressLevel();
        addressLevel.uuid = uuid;
        addressLevel.title = title;
        addressLevel.level = level;
        addressLevel.parentAddressLevel = parentAddressLevel;
        return addressLevel;
    }

    static fromResource(resource) {
        return AddressLevel.create(resource["uuid"], resource["title"], resource["level"]);
    }
}

export default AddressLevel;