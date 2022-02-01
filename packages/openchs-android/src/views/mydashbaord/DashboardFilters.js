import {Text, View, StyleSheet, TouchableOpacity, DatePickerAndroid} from "react-native";
import React from 'react';
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppliedFilters from "../filter/AppliedFilters";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import _ from "lodash";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import moment from "moment";

export default class DashboardFilters extends AbstractComponent {
    static styles = StyleSheet.create({
        itemContent: {
            flexDirection: 'column',
            borderBottomWidth: 1,
            borderColor: Colors.InputBorderNormal,
            backgroundColor: Colors.FilterBar,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
            elevation: 2,
            minHeight: 60
        },
        buttons: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 8,
        },
        filterButton: {
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: Colors.ActionButtonColor,
            borderRadius: 3
        },
        buttonText: {
            color: Colors.TextOnPrimaryColor,
            fontSize: Styles.normalTextSize
        },
        todayButton: {
            paddingVertical: 2,
            borderRadius: 3,
            paddingHorizontal: 8,
            marginLeft: 4,
        }
    });

    dateDisplay(date) {
        return _.isNil(date) ? this.I18n.t("chooseADate") : General.formatDate(date);
    }

    async showPicker(stateKey, options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.dispatchAction(this.props.activityIndicatorActionName, {status: true});
            setTimeout(() => this.dispatchAction(Actions.ON_DATE, {value: new Date(year, month, day)}), 1);
        }
    }

    renderQuickDateOptions(label, value, isFilled) {
        const backgroundColor = {backgroundColor: isFilled ? Colors.ActionButtonColor : Colors.DisabledButtonColor};
        const textColor = {color: isFilled ? Colors.TextOnPrimaryColor : Colors.InputNormal};
        return (
            <TouchableOpacity
                style={[DashboardFilters.styles.todayButton, backgroundColor]}
                onPress={() => this.dispatchAction(Actions.ON_DATE, {value})}
            >
                <Text style={[DashboardFilters.styles.buttonText, textColor]}>{this.I18n.t(label)}</Text>
            </TouchableOpacity>
        )
    }

    render() {
        const isToday = moment(this.props.date.value).isSame(moment(), "day");
        const isTomorrow = moment(this.props.date.value).isSame(moment().add(1, "day"), "day");
        const iconStyle = {
            color: Colors.ActionButtonColor,
            opacity: 0.8,
            alignSelf: 'center',
            fontSize: 30
        };
        return (
            <View>
                <View style={DashboardFilters.styles.itemContent}>
                    <View style={DashboardFilters.styles.buttons}>
                        <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 0.8}}>
                            <Text style={{fontSize: 15, color: Colors.TextOnPrimaryColor}}>{this.I18n.t("asOnDate")}
                                : {this.dateDisplay(this.props.date.value)}</Text>
                            <TouchableOpacity
                                onPress={this.showPicker.bind(this, 'simple', {
                                    date: this.props.date.value,
                                    mode: 'calendar'
                                })}>
                                <MCIIcon name={'calendar'} style={iconStyle}/>
                            </TouchableOpacity>
                            {this.renderQuickDateOptions('Today', new Date(), isToday)}
                            {this.renderQuickDateOptions('Tomorrow', moment().add(1, "day").toDate(), isTomorrow)}
                        </View>
                        <View style={{flex:0.2}}>
                            <TouchableOpacity
                                style={DashboardFilters.styles.filterButton}
                                onPress={this.props.onPress}>
                                <Text style={DashboardFilters.styles.buttonText}>{this.I18n.t("filter")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <AppliedFilters filters={this.props.filters}
                                    selectedLocations={this.props.selectedLocations}
                                    selectedPrograms={this.props.selectedPrograms}
                                    selectedEncounterTypes={this.props.selectedEncounterTypes}
                                    selectedGeneralEncounterTypes={this.props.selectedGeneralEncounterTypes}
                                    selectedCustomFilters={this.props.selectedCustomFilters}
                                    selectedGenders={this.props.selectedGenders}
                                    programs={this.props.programs}/>
                </View>
            </View>
        );
    }
}
