import {Individual} from 'openchs-models';
import General from "../../../src/utility/General";
import moment from "moment";

class TestSubjectFactory {
    static createWithDefaults({subjectType, firstName, lastName, address, registrationDate = moment().toDate(), observations = []}) {
        const subject = new Individual();
        subject.uuid = General.randomUUID();
        subject.subjectType = subjectType;
        subject.firstName = firstName;
        subject.lastName = lastName;
        subject.name = firstName;
        subject.lowestAddressLevel = address;
        subject.registrationDate = registrationDate;
        subject.observations = observations;
        return subject;
    }
}

export default TestSubjectFactory;
