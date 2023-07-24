import _ from "lodash";

class NumericFormElementHelper {
    //note that internal state is updated before dispatch. which means state captures the user intention.
    static getDerivedStateFromProps(props, currentState) {
        // General.logDebugTemp("NumericFormElement-getDerivedStateFromProps", `${props.element.name}: ${props.value.getValue()}, ${currentState.value}`);
        const currentValueAsString = _.toString(currentState.value);
        //adding a zero at the end makes an in-progress number into a number
        const propStringValue = _.toString(props.value.getValue());
        if (propStringValue !== currentValueAsString && !isNaN(_.toNumber(currentValueAsString + "0")) && currentState.userEntered)
            return {
                value: currentValueAsString.trim()
            };
        return {
            value: propStringValue.trim()
        }
    }
}

export default NumericFormElementHelper;
