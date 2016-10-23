class AddressLevel {
    static schema = {
        name: "AddressLevel",
        properties: {
            title: "string",
            level: "int",
            parentAddressLevel: {type: "AddressLevel", optional: true}
        }
    };
}

export default AddressLevel;