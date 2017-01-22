import {expect} from 'chai';
import _ from "lodash";
import FormElementGroup from "../../../js/models/application/FormElementGroup";
import Form from "../../../js/models/application/Form";

describe('FormElementGroupTest', () => {
    it('previous and next', () => {
        const form = Form.create('form1');
        const first = FormElementGroup.create('foo', 1);
        form.addFormElementGroup(first);
        const second = FormElementGroup.create('bar', 2);
        form.addFormElementGroup(second);
        const third = FormElementGroup.create('baz', 3);
        form.addFormElementGroup(third);

        expect(first.next()).is.not.equal(undefined);
        expect(second.next()).is.not.equal(undefined);
        expect(third.next()).is.equal(undefined);

        expect(first.previous()).is.equal(undefined);
        expect(third.previous()).is.not.equal(undefined);
        expect(second.previous()).is.not.equal(undefined);
    });
});