import {Encounter, Form, FormElementGroup, FormElement, Concept} from 'openchs-models';
import GlobalContext from "../src/GlobalContext";
import {assert} from "chai";
import TestFormFactory from "../test/model/form/TestFormFactory";
import TestFormElementGroupFactory from "../test/model/form/TestFormElementGroupFactory";
import BaseIntegrationTest from "./BaseIntegrationTest";
import General from "../src/utility/General";
import TestFormElementFactory from "../test/model/form/TestFormElementFactory";
import TestKeyValueFactory from "../test/model/TestKeyValueFactory";
import TestConceptFactory from "../test/model/TestConceptFactory";

class DatabaseTest extends BaseIntegrationTest {
    shouldReturnFirstElementAsNilIfCollectionIsEmpty() {
        const db = GlobalContext.getInstance().db;
        assert.equal(null, db.objects(Encounter.schema.name)[0]);
        assert.equal(null, db.objects(Encounter.schema.name).filtered("uuid = '1'")[0]);
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
                assert.isTrue(error.message.includes("Attempting to create an object of type 'FormElementGroup'"));
            }

            try {
                db.create(Form, form, false);
                assert.fail("should have failed");
            } catch (error) {
                assert.isTrue(error.message.includes("Attempting to create an object of type 'Form'"));
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
                assert.isTrue(error.message.includes("Attempting to create an object of type 'Form'"));
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
}

export default DatabaseTest;
