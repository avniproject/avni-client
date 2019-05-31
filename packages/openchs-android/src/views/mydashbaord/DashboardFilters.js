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
        },
        buttons: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 4,
        },
    });

    dateDisplay(date) {
        return _.isNil(date) ? this.I18n.t("chooseADate") : General.formatDate(date);
    }

    async showPicker(stateKey, options) {
        const {action, year, month, day} = await DatePickerAndroid.open(options);
        if (action !== DatePickerAndroid.dismissedAction) {
            this.dispatchAction(Actions.ON_DATE, {value: new Date(year, month, day)});
        }
    }

    render() {
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
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={{fontSize: 15, color: Colors.TextOnPrimaryColor}}>As on date
                                : {this.dateDisplay(this.props.date.value)}</Text>
                            <TouchableOpacity
                                onPress={this.showPicker.bind(this, 'simple', {
                                    date: this.props.date.value,
                                    mode: 'calendar'
                                })}>
                                <MCIIcon name={'calendar'} style={iconStyle}/>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={{
                                width: 90,
                                height: 40,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: Colors.ActionButtonColor,
                                borderRadius: 3
                            }}
                            onPress={this.props.onPress}>
                            <Text style={{color: Colors.TextOnPrimaryColor, fontSize: Styles.normalTextSize}}>FILTER</Text>
                        </TouchableOpacity>
                    </View>
                    <AppliedFilters filters={this.props.filters}
                                    selectedLocations={this.props.selectedLocations}
                                    selectedPrograms={this.props.selectedPrograms}
                                    selectedEncounterTypes={this.props.selectedEncounterTypes}
                                    programs={this.props.programs}/>
                </View>
            </View>
        );
    }
}
