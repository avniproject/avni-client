import {assert} from "chai";
import EntityFactory from "../EntityFactory";
import Concept from '../../src/Concept';
import ObservationRule from "../../src/observation/ObservationRule";

describe('FormElementGroupTest', () => {
    it('previous and next', () => {
        const form = EntityFactory.createForm('form1');
        const first = EntityFactory.createFormElementGroup('foo', 1, form);
        form.addFormElementGroup(first);
        const second = EntityFactory.createFormElementGroup('bar', 2, form);
        form.addFormElementGroup(second);
        const third = EntityFactory.createFormElementGroup('baz', 3, form);
        form.addFormElementGroup(third);

        assert.notEqual(first.next(), undefined);
        assert.notEqual(second.next(),undefined);
        assert.equal(third.next(),undefined);

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
});