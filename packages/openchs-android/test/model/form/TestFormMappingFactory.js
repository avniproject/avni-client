import {FormMapping} from 'openchs-models';
import General from "../../../src/utility/General";

class TestFormMappingFactory {
    static createWithDefaults({form: form, subjectType: subjectType, programUUID: programUUID}) {
        const formMapping = new FormMapping();
        formMapping.uuid = General.randomUUID();
        formMapping.form = form;
        formMapping.subjectType = subjectType;
        formMapping.entityUUID = programUUID;
        return formMapping;
    }
}

export default TestFormMappingFactory;
