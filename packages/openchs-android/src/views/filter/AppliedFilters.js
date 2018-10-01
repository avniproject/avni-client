import {Text, View, StyleSheet} from "react-native";
import React from 'react';
import {Badge} from 'native-base';
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import DatePicker from "../primitives/DatePicker";
import Separator from "../primitives/Separator";

export default class AppliedFilters extends AbstractComponent {
    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
        },
    });

    render() {
        const appliedFilters = [...this.props.filters.values()]
            .filter(f => f.isApplied())
            .map((f, idx) =>
                <View key={idx}>
                    <Badge info>{f.toString()}</Badge>
                    <Separator/>
                </View>);
        return (
            <View style={AppliedFilters.styles.container}>
                <Text style={{fontSize: 17, color: Colors.DefaultPrimaryColor, fontWeight: 'bold'}}>Applied
                    Filters</Text>
                {appliedFilters}
            </View>
        );
    }
}