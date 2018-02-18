import {View} from "react-native";
import React from "react"; import PropTypes from 'prop-types';
import AbstractFormElement from "./AbstractFormElement";
import DatePicker from "../../primitives/DatePicker";
import Distances from "../../primitives/Distances";

class DateFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        dateValue: PropTypes.object,
        validationResult: PropTypes.object,
        style: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                {this.label}
                <DatePicker dateValue={this.props.dateValue.getValue()} validationResult={this.props.validationResult}
                            actionObject={{formElement: this.props.element}} actionName={this.props.actionName}/>
            </View>);
    }
}

export default DateFormElement;