import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import {Text} from "native-base";
import General from "../../utility/General";
import {DatePickerAndroid, View} from "react-native";
import ChecklistItem from "../../models/ChecklistItem";
import DatePicker from "../primitives/DatePicker";
import _ from "lodash";

class ChecklistItemDisplay extends AbstractComponent {
    static propTypes = {
        checklistItem: React.PropTypes.object.isRequired,
        completionDateAction: React.PropTypes.string,
        style: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        actionObject: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.checklistItemColorCode = {};
        this.checklistItemColorCode[ChecklistItem.status.Upcoming] = Colors.ChecklistItemUnfulfilled;
        this.checklistItemColorCode[ChecklistItem.status.PastDue] = Colors.ChecklistItemUnfulfilled;
        this.checklistItemColorCode[ChecklistItem.status.Expired] = Colors.ChecklistItemExpired;
        this.checklistItemColorCode[ChecklistItem.status.Completed] = Colors.ChecklistItemFulfilled;
    }

    render() {
        const backgroundColor = this.checklistItemColorCode[this.props.checklistItem.status];
        const date = _.isNil(this.props.checklistItem.completionDate) ? new Date() : this.props.checklistItem.completionDate;
        return (
            <View style={this.appendedStyle()}>
                <View style={{borderRadius: 4, backgroundColor: backgroundColor}}
                      onPress={this.showPicker.bind(this, {date: date})}>
                    <View style={{flexDirection: 'column', alignItems: 'center'}}>
                        <Text style={{fontSize: Fonts.Normal}}>{this.I18n.t(this.props.checklistItem.concept.name)}</Text>
                        <View>
                            <Text style={{fontSize: Fonts.Normal}}>{this.I18n.t('givenOn')}</Text>
                            <DatePicker actionName={this.props.completionDateAction}
                                        validationResult={this.props.validationResult}
                                        dateValue={this.props.checklistItem.completionDate} actionObject={this.props.actionObject}
                                        noDateMessageKey={'notCompleted'}
                            />
                        </View>
                        <Text style={{fontSize: Fonts.Normal}}>{`${this.I18n.t('expires')}: ${General.formatDate(this.props.checklistItem.maxDate)}`}</Text>
                    </View>
                </View>
            </View>
        );
    }

    async showPicker(options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.props.actionObject.value = new Date(year, month, day);
            this.dispatchAction(this.props.completionDateAction, this.props.actionObject);
        }
    }
}

export default ChecklistItemDisplay;