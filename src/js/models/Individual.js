import moment from "moment";

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

    static getAge(individual) {
        var ageInYears = moment().diff(individual.dateOfBirth, 'years');
        return ageInYears > 0 ? `${ageInYears} years` : `${moment().diff(individual.dateOfBirth, 'months')} months`;
    }
}

export default Individual;