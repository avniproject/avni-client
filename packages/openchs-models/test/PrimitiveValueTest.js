import {assert} from 'chai';
import PrimitiveValue from '../src/observation/PrimitiveValue';
import Concept from '../src/Concept';
import General from '../src/utility/General';

describe('getValue', () => {
    describe('when concept datatype is DateTime', () => {
        it('returns Date with time data', () => {
            const date = new Date(2018, 1, 1, 1, 1, 0, 0);
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.DateTime);
            assert(!General.hoursAndMinutesOfDateAreZero(primitiveValue.getValue()), "time data should be there");
        });
    });
    describe('when concept datatype is Date', () => {
        it('returns Date without time data', () => {
            const date = new Date(2018, 1, 1, 1, 1, 0, 0);
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.Date);
            assert(General.hoursAndMinutesOfDateAreZero(primitiveValue.getValue()), "time data should not be there");
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
            const date = new Date(2018, 1, 1, 1, 1, 0, 0);
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.Date);
            assert.equal("01-Feb-2018", primitiveValue.asDisplayDate());
        });

        it('does not return time info when value date do not have time data', () => {
            const date = new Date(2018, 1, 1);
            const primitiveValue = new PrimitiveValue(date, Concept.dataType.Date);
            assert.equal("01-Feb-2018", primitiveValue.asDisplayDate());
        });
    });
});