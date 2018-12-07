import {assert, expect} from 'chai';
import PrimitiveValue from '../src/observation/PrimitiveValue';
import Concept from '../src/Concept';
import General from '../src/utility/General';

describe('getValue', () => {
    describe('when concept datatype is DateTime', () => {
        it('returns Date with time data', () => {
            const date = '2018-11-27T12:34:56.000Z';
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.DateTime);
            expect(primitiveValue.getValue().toISOString()).to.equal(date);
        });
    });

    describe('when concept datatype is Date', () => {
        it('returns Date without time data', () => {
            const date = '2018-11-27T12:34:56.000Z';
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.Date);
            expect('2018-11-27T00:00:00.000Z').to.equal('2018-11-27T00:00:00.000Z');
        });
    });

});

describe('asDisplayDate', () => {
    describe('when concept datatype is DateTime', () => {
        it('returns time info when value date have time data', () => {
            const date = new Date(2018, 1, 1, 1, 1, 0, 0);
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.DateTime);
            assert.equal("01-Feb-2018 01:01", primitiveValue.asDisplayDate());
        });

        it('does not return time info when value date do not have time data', () => {
            const date = new Date(2018, 1, 1);
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.DateTime);
            assert.equal("01-Feb-2018", primitiveValue.asDisplayDate());
        });
    });

    describe('when concept datatype is Date', () => {
        it('does not return time info when value date have time data', () => {
            const date = '2018-02-01T12:34:56.000Z';
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.Date);
            assert.equal("01-Feb-2018", primitiveValue.asDisplayDate());
        });

        it('does not return time info when value date do not have time data', () => {
            const date = '2018-02-01T00:00:00.000Z';
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.Date);
            assert.equal("01-Feb-2018", primitiveValue.asDisplayDate());
        });
    });
});