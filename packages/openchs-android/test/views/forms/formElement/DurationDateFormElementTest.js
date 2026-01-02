import {assert} from "chai";
import DurationDateFormElement from "../../../../src/views/form/formElement/DurationDateFormElement";
import TestContext from "../../../action/views/testframework/TestContext";

describe('DurationDateFormElement', () => {
    let element;
    let testContext;

    beforeEach(() => {
        testContext = new TestContext();
        element = new DurationDateFormElement({}, testContext);
    });

    it('should validate dates within 2000 years as valid', function () {
        assert.isTrue(element.isDateValid(new Date()));
        assert.isTrue(element.isDateValid(new Date('2024-01-01')));
        assert.isTrue(element.isDateValid(null));
        assert.isTrue(element.isDateValid(undefined));
    });

    it('should validate dates over 2000 years as invalid', function () {
        assert.isFalse(element.isDateValid(new Date('0024-01-01')));
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 2001);
        assert.isFalse(element.isDateValid(futureDate));
    });

    it('should validate boundary cases correctly', function () {
        const currentYear = new Date().getFullYear();
        const exactlyTwoThousandYearsAgo = new Date();
        exactlyTwoThousandYearsAgo.setFullYear(currentYear - 2000);
        assert.isTrue(element.isDateValid(exactlyTwoThousandYearsAgo));
        
        const exactlyTwoThousandYearsFuture = new Date();
        exactlyTwoThousandYearsFuture.setFullYear(currentYear + 2000);
        assert.isTrue(element.isDateValid(exactlyTwoThousandYearsFuture));
        
        const overTwoThousandYearsAgo = new Date();
        overTwoThousandYearsAgo.setFullYear(currentYear - 2001);
        assert.isFalse(element.isDateValid(overTwoThousandYearsAgo));
    });

    it('should return validation error for invalid dates', function () {
        element.props = {
            dateValue: {
                getValue: () => new Date('0024-01-01')
            }
        };
        
        const result = element.dateValidationError();
        assert.isNotNull(result);
        assert.equal(result.messageKey, "invalidDate");
    });

    it('should return null for valid dates', function () {
        element.props = {
            dateValue: {
                getValue: () => new Date('2024-01-01')
            }
        };
        
        const result = element.dateValidationError();
        assert.isNull(result);
    });

    it('should return null when no date value exists', function () {
        element.props = {
            dateValue: {
                getValue: () => null
            }
        };
        
        const result = element.dateValidationError();
        assert.isNull(result);
    });
});