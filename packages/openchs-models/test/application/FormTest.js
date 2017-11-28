import {assert} from 'chai';
import EntityFactory from "../EntityFactory";

describe('Form', () => {
    it('can find an element within itself by name', () => {
        const form = EntityFactory.createForm('foo');
        const formElementGroup1 = EntityFactory.createFormElementGroup('bar', 1, form);
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a1'));
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a2'));

        const formElementGroup2 = EntityFactory.createFormElementGroup('bar1', 1, form);
        formElementGroup2.addFormElement(EntityFactory.createFormElement('b1'));
        const formElement = EntityFactory.createFormElement('b2');
        formElementGroup2.addFormElement(formElement);

        const foundFormElement = form.findFormElement('b2');
        assert.notEqual(foundFormElement, undefined);
        assert.equal(foundFormElement.uuid, formElement.uuid);
    });

    it("can remove an element within itself by name", () => {
        const form = EntityFactory.createForm('foo');
        const formElementGroup1 = EntityFactory.createFormElementGroup('bar', 1, form);
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a1'));
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a2'));

        const formElementGroup2 = EntityFactory.createFormElementGroup('bar1', 1, form);
        formElementGroup2.addFormElement(EntityFactory.createFormElement('b1'));
        const formElement = EntityFactory.createFormElement('b2');
        formElementGroup2.addFormElement(formElement);

        assert.equal(form.findFormElement('b2'), formElement);
        assert.notEqual(form.findFormElement('a1'), undefined);

        const modifiedForm = form.removeFormElement('b2');

        assert.equal(modifiedForm.findFormElement('b2'), undefined);
    });
});