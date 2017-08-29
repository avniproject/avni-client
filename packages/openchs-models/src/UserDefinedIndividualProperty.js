class UserDefinedIndividualProperty {
    static schema = {
        name: "UserDefinedIndividualProperty",
        properties: {
            name: "string",
            value: "string",
            unit: {type: "string", optional: true}
        }
    };
}

export default UserDefinedIndividualProperty;