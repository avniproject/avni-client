import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import {Text} from "native-base";
import General from "../../utility/General";
import {Alert, DatePickerAndroid, View} from "react-native";
import {ChecklistItem} from "openchs-models";
import _ from "lodash";
import CHSNavigator from "../../utility/CHSNavigator";

class ChecklistItemDisplay extends AbstractComponent {
    static propTypes = {
        checklistItem: React.PropTypes.object.isRequired,
        completionDateAction: React.PropTypes.string,
        style: React.PropTypes.object,
        editable: React.PropTypes.bool,
        validationResult: React.PropTypes.object,
        actionObject: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.completeChecklistItem = this.completeChecklistItem.bind(this);
    }

    isEditable() {
        return this.props.editable !== false;
    }

    completeChecklistItem(checklistItem) {
        return () => CHSNavigator.navigateToChecklistItemView(this, checklistItem);
    }

    render() {
        const applicableState = this.props.checklistItem.applicableState;
        const backgroundColor = applicableState.color;
        const statusText = applicableState.state;
        const maxDateText = General.toDisplayDate(this.props.checklistItem.maxDate);
        return (
            <View style={this.appendedStyle({
                borderWidth: 2,
                borderColor: 'rgba(97, 97, 97, 0.20)',
                borderRadius: 4,
                backgroundColor: backgroundColor,
                padding: 6,
                margin: 4,
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 1.5
            })} onPress={this.completeChecklistItem(this.props.checklistItem)}>
                <View style={{flexDirection: 'column', alignItems: 'center'}}
                      onPress={this.completeChecklistItem(this.props.checklistItem)}>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{this.I18n.t(this.props.checklistItem.concept.name)}</Text>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{_.startCase(statusText)}</Text>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{maxDateText}</Text>
                </View>
            </View>
        );
    }


}

export default ChecklistItemDisplay;