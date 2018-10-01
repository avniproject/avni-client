import {Text, View, StyleSheet} from "react-native";
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
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: Colors.InputBorderNormal,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
        },
    });

    render() {

        return (
            <View style={DashboardFilters.styles.container}>
                <View style={{flexDirection: 'row', justifyContent: 'space-around'}}>
                    <Text style={{fontSize: 17, color: Colors.DefaultPrimaryColor, fontWeight: 'bold'}}>As On
                        Date: </Text>
                    <DatePicker
                        nonRemovable={true}
                        actionName={Actions.ON_DATE}
                        actionObject={this.props.date}
                        pickTime={false}
                        dateValue={this.props.date.value}/>
                </View>
                <Separator/>
                <AppliedFilters filters={this.props.filters}/>

            </View>
        );
    }
}