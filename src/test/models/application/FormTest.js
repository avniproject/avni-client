import {expect} from 'chai';
import _ from "lodash";
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
        expect(foundFormElement).is.not.equal(undefined);
        expect(foundFormElement.uuid).is.equal(formElement.uuid);
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

        expect(form.findFormElement('b2')).to.equal(formElement);
        expect(form.findFormElement('a1')).not.to.equal(undefined);

        const modifiedForm = form.removeFormElement('b2');

        expect(modifiedForm.findFormElement('b2')).to.equal(undefined);
    });


});