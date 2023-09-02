import {Form} from 'openchs-models';
import General from "../../../src/utility/General";

class TestFormFactory {
    static create({uuid: uuid, formType: formType, name: name, formElementGroups = []}) {
        const form = new Form();
        form.uuid = uuid;
        form.formType = formType;
        form.name = name;
        form.formElementGroups = formElementGroups;
        return form;
    }

    static createWithDefaults({uuid = General.randomUUID(), formType: formType, name = General.randomUUID(), formElementGroups = []}) {
        return TestFormFactory.create({uuid: uuid, formType: formType, name: name, formElementGroups: formElementGroups});
    }
}

export default TestFormFactory;
