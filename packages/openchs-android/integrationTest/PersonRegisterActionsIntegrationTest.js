import TestConceptFactory from "../test/model/TestConceptFactory";
import {Concept, Form} from "openchs-models";
import BaseIntegrationTest from "./BaseIntegrationTest";
import TestFormFactory from "../test/model/form/TestFormFactory";
import TestFormElementGroupFactory from "../test/model/form/TestFormElementGroupFactory";
import TestFormElementFactory from "../test/model/form/TestFormElementFactory";
import FormElementGroup from "../src/views/form/FormElementGroup";

class PersonRegisterActionsIntegrationTest extends BaseIntegrationTest {
    last_page_of_registration_should_show_worklist_correctly() {
        const concept = TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}), Concept);
        const form = this.saveEntity(TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}), Form);
        const formElementGroup = this.saveEntity(TestFormElementGroupFactory.create({form: form}), FormElementGroup);
        const formElement = TestFormElementFactory.create({concept: concept, displayOrder: 1, formElementGroup: formElementGroup});
        this.saveEntity(form, Form);
        // const dispatchResult = this.dispatch({Actions.ON_LOAD});
    }
}

export default PersonRegisterActionsIntegrationTest;
