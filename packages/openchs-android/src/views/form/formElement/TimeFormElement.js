import {View} from "react-native";
import {Text} from "native-base"
import PropTypes from 'prop-types';
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import TimePicker from "../../primitives/TimePicker";
import Distances from "../../primitives/Distances";
import _ from "lodash";
import Styles from "../../primitives/Styles";
import UserInfoService from "../../../service/UserInfoService";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class TimeFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        timeValue: PropTypes.object,
        validationResult: PropTypes.object,
        style: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.userSettings = context.getService(UserInfoService).getUserSettings();
    }

    render() {
        return (
            <View style={this.appendedStyle({paddingVertical: Distances.VerticalSpacingBetweenFormElements})}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {
                    this.props.element.editable === false ?
                         <Text  style={[{
                             flex: 1,
                             marginVertical: 0,
                             paddingVertical: 5
                         }, Styles.formBodyText]}>{_.isNil(this.props.timeValue.getValue()) ? this.I18n.t('Not Known Yet') :this.props.timeValue.asDisplayDate()}</Text>:
                        <TimePicker timeValue={this.props.timeValue.getValue()}
                                    validationResult={this.props.validationResult}
                                    actionObject={{formElement: this.props.element, parentFormElement: this.props.parentElement, questionGroupIndex: this.props.questionGroupIndex}}
                                    actionName={this.props.actionName}
                                    timePickerDisplay={_.isNil(this.props.element.timePickerMode)
                                        ? this.userSettings.timePickerMode
                                        : this.props.element.timePickerMode
                                    }
                        />
}
            </View>);
    }
}

export default TimeFormElement;
