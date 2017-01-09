import moment from "moment";
import ResourceUtil from "../utility/ResourceUtil";
import AddressLevel from "./AddressLevel";
import Gender from "./Gender";
import General from "../utility/General";
import BaseEntity from "./BaseEntity";
import ProgramEnrolment from "./ProgramEnrolment";
import Encounter from "./Encounter";
import Duration from "./Duration";
import _ from "lodash";

class Individual extends BaseEntity {
    static schema = {
        name: "Individual",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string",
            dateOfBirth: "date",
            dateOfBirthVerified: "bool",
            gender: 'Gender',
            lowestAddressLevel: 'AddressLevel',
            enrolments: {type: "list", objectType: "ProgramEnrolment"},
            encounters: {type: "list", objectType: "Encounter"},
            customProfile: {type: 'list', objectType: 'Observation'}
        }
    };

    get toResource() {
        const resource = _.pick(this, ["uuid", "name", "dateOfBirthVerified"]);
        resource.dateOfBirth = moment(this.dateOfBirth).format('YYYY-MM-DD');
        resource["genderUUID"] = this.gender.uuid;
        resource["addressLevelUUID"] = this.lowestAddressLevel.uuid;
        return resource;
    }

    static newInstance(uuid, name, dateOfBirth, dateOfBirthVerified, gender, lowestAddressLevel) {
        const individual = new Individual();
        individual.uuid = uuid;
        individual.name = name;
        individual.dateOfBirth = dateOfBirth;
        individual.dateOfBirthVerified = dateOfBirthVerified;
        individual.gender = gender;
        individual.lowestAddressLevel = lowestAddressLevel;
        return individual;
    }

    static fromResource(individualResource, entityService) {
        const addressLevel = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(individualResource, "addressUUID"), AddressLevel.schema.name);
        const gender = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(individualResource, "genderUUID"), Gender.schema.name);

        const individual = General.assignFields(individualResource, new Individual(), ["uuid", "name", "dateOfBirthVerified"], ["dateOfBirth"], ["customProfile"]);

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
        const age = individual.getAge();
        return age.toString();
    }

    getAge() {
        const ageInYears = moment().diff(this.dateOfBirth, 'years');
        return ageInYears > 0 ? Duration.inYear(ageInYears) : Duration.inMonth(moment().diff(this.dateOfBirth, 'months'));
    }

    toSummaryString() {
        return `${this.name}, Age: ${this.getAge().toString()}, ${this.gender.name}`;
    }

    setDateOfBirth(date) {
        this.dateOfBirth = date;
        this.dateOfBirthVerified = true;
    }

    setAge(age, isInYears) {
        this.dateOfBirth = moment().subtract(age, isInYears ? 'years' : 'months').toDate();
        this.dateOfBirthVerified = false;
    }

    static eligiblePrograms(allPrograms, individual) {
        const eligiblePrograms = _.slice(allPrograms);

        _.remove(eligiblePrograms, (program) => {
            const find = _.find(individual.enrolments, (enrolment) => {
                return enrolment.program.uuid === program.uuid && ProgramEnrolment.isActive(enrolment);
            });
            return find !== undefined;
        });

        return eligiblePrograms;
    }
}

export default Individual;