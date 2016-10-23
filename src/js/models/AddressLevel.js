class AddressLevel {
    static schema = {
        name: "AddressLevel",
        properties: {
            title: "string",
            level: "int",
            parentAddressLevel: {type: "AddressLevel", optional: true}
        }
    };

    static create(title, level, parentAddressLevel) {
        const addressLevel = new AddressLevel();
        addressLevel.title = title;
        addressLevel.level = level;
        addressLevel.parentAddressLevel = parentAddressLevel;
        return addressLevel;
    }
}

export default AddressLevel;