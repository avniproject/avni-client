import {Individual} from 'openchs-models';
import General from "../../../src/utility/General";

class TestSubjectFactory {
    static createWithDefaults({subjectType, firstName, lastName, address}) {
        const individual = new Individual();
        individual.uuid = General.randomUUID();
        individual.subjectType = subjectType;
        individual.firstName = firstName;
        individual.lastName = lastName;
        individual.lowestAddressLevel = address;
        return individual;
    }
}

export default TestSubjectFactory;
