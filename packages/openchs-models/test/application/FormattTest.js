import {assert} from "chai";
import Format from "../../src/application/Format"

describe("FormattTest", () => {
    it('should return true when the value matches regex', () => {
        const format = new Format();
        format.regex = "^[0-9]{0,2}$";
        assert.isTrue(format.valid("12"));
        assert.isTrue(format.valid("1"));

    });
    it('should return false when the value does not match regex', () => {
        const format = new Format();
        format.regex = "^[0-9]{0,2}$";
        assert.isFalse(format.valid("123"));
    });
});
