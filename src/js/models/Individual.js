import moment from "moment";
import ResourceUtil from "../utility/ResourceUtil";
import AddressLevel from "./AddressLevel";
import Gender from "./Gender";
import General from "../utility/General";
import BaseEntity from "./BaseEntity";
import ProgramEnrolment from "./ProgramEnrolment";
import Encounter from "./Encounter";

class Individual extends BaseEntity {
    static schema = {
        name: "Individual",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string",
            dateOfBirth: "date",
            dateOfBirthEstimated: "bool",
            gender: 'Gender',
            lowestAddressLevel: 'AddressLevel',
            enrolments: {type: "list", objectType: "ProgramEnrolment"},
            encounters: {type: "list", objectType: "Encounter"},
            customProfile: {type: 'list', objectType: 'Observation'}
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
        var addressLevel = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(individualResource, "addressUUID"), AddressLevel.schema.name);
        var gender = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(individualResource, "genderUUID"), Gender.schema.name);

        var individual = General.assignFields(individualResource, new Individual(), ["uuid", "name", "dateOfBirthEstimated"], ["dateOfBirth"], ["customProfile"]);

        individual.gender = gender;
        individual.lowestAddressLevel = addressLevel;

        return individual;
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "individualUUID"), Individual.schema.name);
        individual = General.pick(individual, ["uuid"], ["enrolments", "encounters"]);

        if (childEntityClass === ProgramEnrolment)
            BaseEntity.addNewChild(child, individual.enrolments);
        else if (childEntityClass === Encounter)
            BaseEntity.addNewChild(child, individual.encounters);
        else
            throw `${childEntityClass.name} not support by ${Individual.name}`;
        return individual;
    }

    static getDisplayAge(individual) {
        var ageInYears = moment().diff(individual.dateOfBirth, 'years');
        return ageInYears > 0 ? `${ageInYears} years` : `${moment().diff(individual.dateOfBirth, 'months')} months`;
    }

    toSummaryString() {
        return `${this.name}, Age: ${Individual.getDisplayAge(this)}, ${this.gender.name}`;
    }
}

export default Individual;