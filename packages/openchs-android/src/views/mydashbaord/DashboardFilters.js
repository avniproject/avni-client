import {Text, View, StyleSheet, Button, TouchableOpacity} from "react-native";
import React from 'react';
import DatePicker from "../primitives/DatePicker";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import AppliedFilters from "../filter/AppliedFilters";
import Separator from "../primitives/Separator";

export default class DashboardFilters extends AbstractComponent {
    static styles = StyleSheet.create({
        itemContent: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderColor: Colors.InputBorderNormal,
            backgroundColor: Colors.FilterBar,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
        },
        textContainer: {
            backgroundColor: Colors.FilterBar,
            flex: 7,
            padding: 5,
        },
        label: {
            marginTop: 10,
            textAlign: 'right',
            padding: 3,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
        }
    });

    render() {
        return (
            <View style={DashboardFilters.styles.itemContent}>
                <View style={DashboardFilters.styles.textContainer}>
                    <Text style={{fontSize: 17, color: Colors.TextOnPrimaryColor, fontWeight: 'bold'}}>As On
                        Date: </Text>
                    <DatePicker
                        nonRemovable={true}
                        actionName={Actions.ON_DATE}
                        actionObject={this.props.date}
                        pickTime={false}
                        dateValue={this.props.date.value}/>
                    <AppliedFilters filters={this.props.filters}/>
                </View>
                <View style={DashboardFilters.styles.label}>
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
                        <Text style={{color: Colors.TextOnPrimaryColor, weight: "bold"}}>FILTER</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}
