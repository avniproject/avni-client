import {expect} from "chai";
import EntityFactory from "../EntityFactory";

describe('FormElementGroupTest', () => {
    it('previous and next', () => {
        const form = EntityFactory.createForm('form1');
        const first = EntityFactory.createFormElementGroup('foo', 1, form);
        form.addFormElementGroup(first);
        const second = EntityFactory.createFormElementGroup('bar', 2, form);
        form.addFormElementGroup(second);
        const third = EntityFactory.createFormElementGroup('baz', 3, form);
        form.addFormElementGroup(third);

        expect(first.next()).is.not.equal(undefined);
        expect(second.next()).is.not.equal(undefined);
        expect(third.next()).is.equal(undefined);

        expect(first.previous()).is.equal(undefined);
        expect(third.previous()).is.not.equal(undefined);
        expect(second.previous()).is.not.equal(undefined);

        expect(first.isFirst).is.equal(true);
        expect(second.isFirst).is.equal(false);
    });
});