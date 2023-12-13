import {SubjectType} from "openchs-models";
import General from "../../src/utility/General";

class TestSubjectTypeFactory {
    static createWithDefaults({uuid = General.randomUUID(), type = "foo", name = General.randomUUID(), isGroup = false, validFirstNameFormat}) {
        const subjectType = new SubjectType();
        subjectType.uuid = uuid;
        subjectType.name = name;
        subjectType.type = type;
        subjectType.group = isGroup;
        subjectType.validFirstNameFormat = validFirstNameFormat;
        return subjectType;
    }
}

export default TestSubjectTypeFactory;
