import {expect} from 'chai';
import _ from "lodash";
import EntityFactory from "../EntityFactory";

describe('FormTest', () => {
    it('findFormElementByName', () => {
        const form = EntityFactory.createForm('foo');
        const formElementGroup1 = EntityFactory.createFormElementGroup('bar', 1, form);
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a1'));
        formElementGroup1.addFormElement(EntityFactory.createFormElement('a2'));

        const formElementGroup2 = EntityFactory.createFormElementGroup('bar', 1, form);
        formElementGroup1.addFormElement(EntityFactory.createFormElement('b1'));
        const formElement = EntityFactory.createFormElement('b2');
        formElementGroup1.addFormElement(formElement);

        const foundFormElement = form.findFormElement('b2');
        expect(foundFormElement).is.not.equal(undefined);
        expect(foundFormElement.uuid).is.equal(formElement.uuid);
    });
});