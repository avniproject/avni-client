import {Text, View, StyleSheet, Button, TouchableOpacity} from "react-native";
import React from 'react';
import DatePicker from "../primitives/DatePicker";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppliedFilters from "../filter/AppliedFilters";

export default class DashboardFilters extends AbstractComponent {
    static styles = StyleSheet.create({
        itemContent: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderColor: Colors.InputBorderNormal,
            backgroundColor: Colors.FilterBar,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
        },
        filterContainer: {
            borderBottomWidth: 1,
            borderColor: Colors.InputBorderNormal,
            backgroundColor: Colors.FilterBar,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
        },
    });

    render() {
        return (
            <View>
                <View style={DashboardFilters.styles.itemContent}>
                    <View style={{flex: 1}}>
                        <Text style={{fontSize: 15, color: Colors.TextOnPrimaryColor}}>Date</Text>
                        <DatePicker
                            nonRemovable={true}
                            actionName={Actions.ON_DATE}
                            actionObject={this.props.date}
                            pickTime={false}
                            dateValue={this.props.date.value}/>
                    </View>
                    <TouchableOpacity
                        style={{
                            width: 80,
                            height: 30,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: Colors.ActionButtonColor,
                            borderRadius: 3
                        }}
                        onPress={this.props.onPress}>
                        <Text style={{color: Colors.TextOnPrimaryColor}}>FILTER</Text>
                    </TouchableOpacity>
                </View>
                <View style={DashboardFilters.styles.filterContainer}>
                    <AppliedFilters filters={this.props.filters} selectedLocations={this.props.selectedLocations}/>
                </View>
            </View>
        );
    }
}
