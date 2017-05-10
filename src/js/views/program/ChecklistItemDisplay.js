import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import {Text} from "native-base";
import General from "../../utility/General";
import {Alert, DatePickerAndroid, View} from "react-native";
import ChecklistItem from "../../models/ChecklistItem";
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
        this.checklistItemColorCode[ChecklistItem.status.Upcoming] = Colors.ChecklistItemUpcoming;
        this.checklistItemColorCode[ChecklistItem.status.PastDue] = Colors.ChecklistItemUnfulfilled;
        this.checklistItemColorCode[ChecklistItem.status.Expired] = Colors.ChecklistItemExpired;
        this.checklistItemColorCode[ChecklistItem.status.Completed] = Colors.ChecklistItemFulfilled;
    }

    render() {
        const backgroundColor = this.checklistItemColorCode[this.props.checklistItem.status];
        const date = _.isNil(this.props.checklistItem.completionDate) ? new Date() : this.props.checklistItem.completionDate;
        const statusText = this.props.checklistItem.getStatusMessage(this.I18n);
        const maxDateText = this.I18n.t('lastDate', {lastDate: General.formatDate(this.props.checklistItem.maxDate)});
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
            })} onPress={this.showPicker.bind(this, {date: date})}>
                <View style={{flexDirection: 'column', alignItems: 'center'}} onPress={this.getPopUpFunction(date, this.props.checklistItem)}>
                    <Text style={{fontSize: Fonts.Normal}} onPress={this.getPopUpFunction(date, this.props.checklistItem)}>{this.I18n.t(this.props.checklistItem.concept.name)}</Text>
                    <Text style={{fontSize: Fonts.Normal}} onPress={this.getPopUpFunction(date, this.props.checklistItem)}>{statusText}</Text>
                    <Text style={{fontSize: Fonts.Normal}} onPress={this.getPopUpFunction(date, this.props.checklistItem)}>{maxDateText}</Text>
                </View>
            </View>
        );
    }

    getPopUpFunction(date, checklistItem) {
        return checklistItem.completed ? this.confirmNotComplete.bind(this) : this.showPicker.bind(this, {date: date}, checklistItem);
    }

    async showPicker(options, checklistItem) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            try {
                const date = new Date(year, month, day);
                var message;
                if (checklistItem.isNotDueOn(date)) {
                    message = this.I18n.t('isNotDueOn', {
                        checklistItemName: this.I18n.t(checklistItem.concept.name),
                        dueDate: General.formatDate(checklistItem.dueDate)
                    });
                }
                if (this.props.checklistItem.isAfterMaxDate(date)) {
                    message = this.I18n.t('isAfterMaxDate', {
                        checklistItemName: this.I18n.t(checklistItem.concept.name),
                        maxDate: General.formatDate(checklistItem.maxDate)
                    });
                }

                if (_.isNil(message))
                    this.changeCompletionDate(date);
                else
                    Alert.alert(this.I18n.t("confirm"), message,
                        [
                            {
                                text: this.I18n.t('yes'), onPress: () => {
                                this.changeCompletionDate(date);
                            }
                            },
                            {
                                text: this.I18n.t('no'), onPress: () => {
                            }
                            },
                        ]
                    );
            } catch (e) {
                General.logError('ChecklistItemDisplay', e);
            }
        }
    }

    changeCompletionDate(date) {
        this.props.actionObject.value = date;
        this.dispatchAction(this.props.completionDateAction, this.props.actionObject);
    }

    confirmNotComplete() {
        Alert.alert(this.I18n.t("confirm"), this.I18n.t("askIfNotComplete"),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                    this.props.actionObject.value = null;
                    this.dispatchAction(this.props.completionDateAction, this.props.actionObject);
                }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                }
                },
            ]
        );
    }
}

export default ChecklistItemDisplay;