import {View} from "react-native";
import {Text} from "native-base"
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import DatePicker from "../../primitives/DatePicker";
import Distances from "../../primitives/Distances";
import _ from "lodash";
import Styles from "../../primitives/Styles";
import {Concept} from "openchs-models";
import UserInfoService from "../../../service/UserInfoService";

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
        this.userSettings = context.getService(UserInfoService).getUserSettings();
    }

    render() {
        const concept = this.props.element.concept;
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                {this.label}
                {
                    this.props.element.editable === false ?
                         <Text  style={[{
                             flex: 1,
                             marginVertical: 0,
                             paddingVertical: 5
                         }, Styles.formBodyText]}>{_.isNil(this.props.dateValue.getValue()) ? this.I18n.t('Not Known Yet') :this.props.dateValue.asDisplayDate()}</Text>:
                        <DatePicker dateValue={this.props.dateValue.getValue()}
                                    validationResult={this.props.validationResult}
                                    datePickerMode={_.isNil(this.props.element.datePickerMode)
                                        ? this.userSettings.datePickerMode
                                        : this.props.element.datePickerMode
                                    }
                                    pickTime={concept && concept.datatype === Concept.dataType.DateTime}
                                    actionObject={{formElement: this.props.element}} actionName={this.props.actionName}/>
}
            </View>);
    }
}

export default DateFormElement;