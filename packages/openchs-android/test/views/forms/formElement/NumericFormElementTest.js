import {assert} from "chai";
import NumericFormElementHelper from "../../../../src/views/form/formElement/NumericFormElementHelper";

function getDisplayValue(propValue, currentStateValue, userEntered = true) {
    const {value} = NumericFormElementHelper.getDerivedStateFromProps({
        value: {
            getValue: function () {
                return propValue;
            }
        }
    }, {value: currentStateValue, userEntered: userEntered});
    return value;
}

it('should get displayable value from numeric value', function () {
    //same values
    assert.equal("0", getDisplayValue("0", "0"));
    assert.equal("10", getDisplayValue("10", "10"));
    assert.equal("-10", getDisplayValue("-10", "-10"));

    //decimal entry
    assert.equal("0.", getDisplayValue("0", "0."));
    assert.equal("1.", getDisplayValue("1", "1."));
    assert.equal("1.", getDisplayValue("1.1", "1."));

    //negative sign
    assert.equal("-", getDisplayValue("", "-"));
    assert.equal("-1", getDisplayValue("", "-1"));
});

it('should overwrite with rule value always', function () {
    //decimal value
    assert.equal("0", getDisplayValue("0", "0.", false));
    assert.equal("1", getDisplayValue("1", "1.", false));
    assert.equal("1.1", getDisplayValue("1.1", "1.", false));

    //negative value
    assert.equal("", getDisplayValue("", "-", false));
    assert.equal("", getDisplayValue("", "-1", false));

    assert.equal("3000", getDisplayValue("3000", "100", false));
});
