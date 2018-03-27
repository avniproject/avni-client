import {assert} from "chai";
import EntityFactory from "../EntityFactory";
import Concept from '../../src/Concept';
import FormElement from "openchs-models/src/application/FormElement";
import FormElementStatus from "../../src/application/FormElementStatus";
import FormElementGroup from "../../src/application/FormElementGroup";

describe('FormElementGroupTest', () => {
    it('previous and next', () => {
        const form = EntityFactory.createForm('form1');
        const first = EntityFactory.createFormElementGroup('foo', 1, form);
        const second = EntityFactory.createFormElementGroup('bar', 2, form);
        const third = EntityFactory.createFormElementGroup('baz', 3, form);

        assert.notEqual(first.next(), undefined);
        assert.notEqual(second.next(), undefined);
        assert.equal(third.next(), undefined);

        assert.equal(first.previous(), undefined);
        assert.notEqual(third.previous(), undefined);
        assert.notEqual(second.previous(), undefined);

        assert.equal(first.isFirst, true);
        assert.equal(second.isFirst, false);
    });

    it('getFormElements', () => {
        const form = EntityFactory.createForm('form1');
        const formElementGroup = EntityFactory.createFormElementGroup('foo', 1, form);
        formElementGroup.addFormElement(EntityFactory.createFormElement("bar", false, EntityFactory.createConcept("bar", Concept.dataType.Text), 2));
        formElementGroup.addFormElement(EntityFactory.createFormElement("baz", false, EntityFactory.createConcept("bar", Concept.dataType.Text), 1));
        assert.equal(formElementGroup.getFormElements().length, 2);
    });

    it('filterElements', () => {
        let formElements = [createFormElement('ABCD'), createFormElement('EFGH'), createFormElement('IJKL')];
        let formElementStatuses = [new FormElementStatus('ABCD', true, 1), new FormElementStatus('EFGH', false, 1), new FormElementStatus('IJKL', true, 1)];
        let formElementGroup = new FormElementGroup();
        formElementGroup.formElements = formElements;
        let filteredElements = formElementGroup.filterElements(formElementStatuses);
        assert.equal(filteredElements.length, 2);
    });

    it('filterElementAnswers', () => {
        let formElements = [createFormElement('ABCD', ["Answer 1", "Answer 2"]), createFormElement('EFGH'), createFormElement('IJKL', ["Answer 3", "Answer 4"])];
        let formElementStatuses = [new FormElementStatus('ABCD', true, 1, ["Answer 1"]), new FormElementStatus('EFGH', false, 1), new FormElementStatus('IJKL', true, 1, ["Answer 3", "Answer 4"])];
        let formElementGroup = new FormElementGroup();
        formElementGroup.formElements = formElements;
        let filteredElements = formElementGroup.filterElements(formElementStatuses);
        assert.equal(filteredElements[0].answersToExclude.length, 1);
        assert.equal(filteredElements[1].answersToExclude.length, 2);
    });

    function createFormElement(uuid, answers = []) {
        let x = new FormElement();
        x.uuid = uuid;
        x.getRawAnswers = function () {
            return answers;
        }
        return x;
    }
});