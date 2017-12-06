import {View} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import DatePicker from "../primitives/DatePicker";
import Distances from "../primitives/Distances";

class DateFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        dateValue: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        style: React.PropTypes.object
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