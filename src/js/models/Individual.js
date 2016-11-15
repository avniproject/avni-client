import moment from "moment";
import ResourceUtil from "../utility/ResourceUtil";
import AddressLevel from "./AddressLevel";
import Gender from "./Gender";

class Individual {
    static schema = {
        name: "Individual",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string",
            dateOfBirth: "date",
            dateOfBirthEstimated: "bool",
            gender: {type: "Gender"},
            lowestAddressLevel: {type: "AddressLevel"},
            detailedAddress: {type: "string", optional: true},
            userDefined: {type: "list", objectType: "UserDefinedIndividualProperty"}
        }
    };

    static newInstance(uuid, name, dateOfBirth, dateOfBirthEstimated, gender, lowestAddressLevel) {
        var individual = new Individual();
        individual.uuid = uuid;
        individual.name = name;
        individual.dateOfBirth = dateOfBirth;
        individual.dateOfBirthEstimated = dateOfBirthEstimated;
        individual.gender = gender;
        individual.lowestAddressLevel = lowestAddressLevel;
        return individual;
    }

    static fromResource(individualResource, entityService) {
        var addressLevel = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(individualResource, "address"), AddressLevel.schema.name);
        var gender = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(individualResource, "gender"), Gender.schema.name);
        return Individual.newInstance(individualResource.uuid, individualResource.name, new Date(individualResource.dateOfBirth), individualResource.dateOfBirthEstimated, gender, addressLevel);
    }

    static getDisplayAge(individual) {
        var ageInYears = moment().diff(individual.dateOfBirth, 'years');
        return ageInYears > 0 ? `${ageInYears} years` : `${moment().diff(individual.dateOfBirth, 'months')} months`;
    }

    toSummaryString() {
        return `${this.name}, Age: ${Individual.getDisplayAge(this)}, ${this.gender}`;
    }
}

export default Individual;