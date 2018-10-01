import {Text, View, StyleSheet} from "react-native";
import React from 'react';
import {Badge} from 'native-base';
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";

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
            .map((f, idx) => <Badge info key={idx}>{f.toString()}</Badge>);
        return (
            <View style={AppliedFilters.styles.container}>
                {appliedFilters}
            </View>
        );
    }
}