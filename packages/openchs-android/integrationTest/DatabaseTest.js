import {Concept, Encounter, Form, Format, FormElement, FormElementGroup, SubjectType} from 'openchs-models';
import GlobalContext from "../src/GlobalContext";
import {assert} from "chai";
import TestFormFactory from "../test/model/form/TestFormFactory";
import TestFormElementGroupFactory from "../test/model/form/TestFormElementGroupFactory";
import BaseIntegrationTest from "./BaseIntegrationTest";
import General from "../src/utility/General";
import TestFormElementFactory from "../test/model/form/TestFormElementFactory";
import TestKeyValueFactory from "../test/model/TestKeyValueFactory";
import TestConceptFactory from "../test/model/TestConceptFactory";
import TestSubjectTypeFactory from "../test/model/TestSubjectTypeFactory";
import TestFormatFactory from "../test/model/TestFormatFactory";

class DatabaseTest extends BaseIntegrationTest {
    shouldReturnFirstElementAsNilIfCollectionIsEmpty() {
        const db = GlobalContext.getInstance().db;
        assert.equal(db.objects(Encounter.schema.name).length, 0);
        const objects = db.objects(Encounter.schema.name);
        assert.equal(objects[0], null);
        assert.equal(db.objects(Encounter.schema.name).filtered("uuid = '1'")[0], null);
    }

    save_plain_object_graph_causes_circular_saves_leading_to_error() {
        //Realm doesn't know how to save a self referential object graph. The object graph construction needs to happen within write transaction.
        let form = TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile});
        const formElementGroup = TestFormElementGroupFactory.create({form: form});
        this.executeInWrite((db) => {
            try {
                db.create(FormElementGroup, formElementGroup, false);
                assert.fail("should have failed");
            } catch (error) {
                console.log("Actual error message:", error.message);
                assert.isTrue(error.message.includes("Attempting to create an object of type 'FormElementGroup'"), `Expected error message to contain 'Attempting to create an object of type FormElementGroup' but got: '${error.message}'`);
            }

            try {
                db.create(Form, form, false);
                assert.fail("should have failed");
            } catch (error) {
                console.log("Actual error message for Form:", error.message);
                assert.isTrue(error.message.includes("Attempting to create an object of type 'Form'"), `Expected error message to contain 'Attempting to create an object of type Form' but got: '${error.message}'`);
            }
        });

        // not just a problem with our models but with plain objects as well
        form = {};
        form.uuid = General.randomUUID();
        form.formType = Form.formTypes.IndividualProfile;
        form.name = "foo";
        form.formElementGroups = [{
            uuid: General.randomUUID(),
            name: "foo",
            displayOrder: 1,
            form: form
        }];
        this.executeInWrite((db) => {
            try {
                db.create(Form, form, false);
                assert.fail("should have failed");
            } catch (error) {
                console.log("Actual error message for plain Form:", error.message);
                assert.isTrue(error.message.includes("Attempting to create an object of type 'Form'"), `Expected error message to contain 'Attempting to create an object of type Form' but got: '${error.message}'`);
            }
        });
    }

    ignore_save_plain_object_graph_with_update_true_crashes() {
        const form = {};
        form.uuid = General.randomUUID();
        form.formType = Form.formTypes.IndividualProfile;
        form.name = "foo";
        form.formElementGroups = [{
            uuid: General.randomUUID(),
            name: "foo",
            displayOrder: 1,
            form: form
        }];
        this.executeInWrite((db) => {
            db.create(Form, form, true);
        });
    }

    creating_objects_in_transaction_with_update_mode_true_works() {
        let form, formElementGroup, formElement, concept;
        this.executeInWrite((db) => {
            concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
            formElementGroup = db.create(FormElementGroup, TestFormElementGroupFactory.create({form: form}));
            formElement = db.create(FormElement, TestFormElementFactory.create({
                concept: concept,
                displayOrder: 1,
                formElementGroup: formElementGroup,
                mandatory: true,
                keyValues: [TestKeyValueFactory.create({key: "unique", value: "true"})]
            }));
        });
        assert.equal(this.getEntity(FormElement, formElement.uuid).uuid, formElement.uuid);
    }

    embedded_value_objects_doesnt_create_orphan_data() {
        const regex = "/^(https?:\/\/)?(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/";
        let subjectTypeId;
        const format = TestFormatFactory.create(regex, "foo");
        this.executeInWrite((db) => {
            const subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({validFirstNameFormat: format}));
            subjectTypeId = subjectType.uuid;
        });
        this.executeInWrite((db) => {
            const subjectType = this.getEntity(SubjectType, subjectTypeId);
            subjectType.validFirstNameFormat = format;
        });
        const number = GlobalContext.getInstance().db.objects(SubjectType.schema.name).filtered(`validFirstNameFormat.descriptionKey = "foo"`).length;
        assert.equal(number, 1);
    }
}

export default DatabaseTest;
