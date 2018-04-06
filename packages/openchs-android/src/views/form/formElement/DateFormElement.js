import {View} from "react-native";
import {Text} from "native-base"
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import DatePicker from "../../primitives/DatePicker";
import Distances from "../../primitives/Distances";
import _ from "lodash";
import Styles from "../../primitives/Styles";

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
                {
                    this.props.element.editable === false ?
                         <Text  style={[{
                             flex: 1,
                             marginVertical: 0,
                             paddingVertical: 5
                         }, Styles.formBodyText]}>{_.isNil(this.props.dateValue.getValue()) ? this.I18n.t('NOT KNOWN YET') :this.props.dateValue.asDisplayDate()}</Text>:
                        <DatePicker dateValue={this.props.dateValue.getValue()}
                                    validationResult={this.props.validationResult}
                                    actionObject={{formElement: this.props.element}} actionName={this.props.actionName}/>
}
            </View>);
    }
}

export default DateFormElement;