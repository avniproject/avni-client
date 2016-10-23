class Individual {
    static schema = {
        name: "Individual",
        properties: {
            name: "string",
            dateOfBirth: "date",
            dateOfBirthEstimated: "bool",
            gender: "string",
            lowestAddressLevel: {type: "list", objectType: "AddressLevel"},
            detailedAddress: {type: "string", optional: true},
            userDefined: {type: "list", objectType: "UserDefinedIndividualProperty"}
        }
    };
}

export default Individual;