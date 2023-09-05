import {Gender} from 'openchs-models';
import General from "../../src/utility/General";

class TestGenderFactory {
    static createWithDefaults({name}) {
        const gender = new Gender();
        gender.uuid = General.randomUUID();
        gender.name = name;
        return gender;
    }
}

export default TestGenderFactory;
