import BaseIntegrationTest from "./BaseIntegrationTest";
import {Concept, Form, getUnderlyingRealmCollection} from "openchs-models";
import TestConceptFactory from "../test/model/TestConceptFactory";
import {JSONStringify} from "../src/utility/JsonStringify";
import {assert} from "chai";
import TestFormFactory from "../test/model/form/TestFormFactory";

class UtilTest extends BaseIntegrationTest {
    shouldIgnoreRealmCollectionsWhenStringifying() {
        let concept;
        this.executeInWrite((db) => {
            concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
        });
        const obj = {x: "abc", y: getUnderlyingRealmCollection(this.getAllEntities(Concept))};
        assert.equal(JSONStringify(obj), `{"x":"abc","y":<realm-collection>}`);
    }

    doesntSerialiseModelObjects() {
        let form;
        this.executeInWrite((db) => {
            form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
        });

        form = this.getEntity(Form, form.uuid);
        const obj = {x: "abc", y: form};
        assert.equal(JSONStringify(obj, 5), `{"x":"abc","y":{"that":{}}}`);
    }
}

export default UtilTest;
