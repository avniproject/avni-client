import {assert} from 'chai';
import PrimitiveValue from "../src/observation/PrimitiveValue";
import Concept from "../src/Concept";

describe('PrimitiveValueTest', () => {
    it('Primitive Value With Time', () => {
        const date = new Date(2018, 1, 1, 1, 1, 0, 0);
        const primitiveValue = new PrimitiveValue(date, Concept.dataType.DateTime);
        assert.equal("01-Feb-2018 01:01", primitiveValue.asDisplayDate())
    });
    it('Primitive Value Without Time', () => {
        const date = new Date(2018, 1, 1);
        const primitiveValue = new PrimitiveValue(date, Concept.dataType.DateTime);
        assert.equal("01-Feb-2018", primitiveValue.asDisplayDate())
    });
});