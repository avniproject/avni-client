import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import {Text} from "native-base";
import General from "../../utility/General";
import {Alert, DatePickerAndroid, View, TouchableHighlight} from "react-native";
import {ChecklistItem} from "openchs-models";
import _ from "lodash";
import CHSNavigator from "../../utility/CHSNavigator";
import ObservationsHolder from "openchs-models/src/ObservationsHolder";

class ChecklistItemDisplay extends AbstractComponent {
    static propTypes = {
        checklistItem: React.PropTypes.object.isRequired,
        applicableState: React.PropTypes.object.isRequired,
        completionDateAction: React.PropTypes.string,
        style: React.PropTypes.object,
        editable: React.PropTypes.bool,
    };

    constructor(props, context) {
        super(props, context);
        this.completeChecklistItem = this.completeChecklistItem.bind(this);
    }

    completeChecklistItem(checklistItem) {
        return () => {
            if (this.props.checklistItem.editable)
                CHSNavigator.navigateToChecklistItemView(this, checklistItem);
            else
                Alert.alert(this.I18n.t("voidedChecklistItemDetailAlertTitle"), new ObservationsHolder(checklistItem.observations).toString(this.I18n));
        }
    }

    render() {
        const status = this.props.applicableState.status;
        const backgroundColor = status.color;
        const statusText = status.state;
        const maxDateText = General.toDisplayDate(this.props.applicableState.statusDate);
        return (
            <TouchableHighlight style={this.appendedStyle({
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
                <View style={{flexDirection: 'column', alignItems: 'center'}}>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{this.I18n.t(this.props.checklistItem.detail.concept.name)}</Text>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{_.startCase(statusText)}</Text>
                    <Text style={{fontSize: Fonts.Normal}}
                          onPress={this.completeChecklistItem(this.props.checklistItem)}>{maxDateText}</Text>
                </View>
            </TouchableHighlight>
        );
    }


}

export default ChecklistItemDisplay;