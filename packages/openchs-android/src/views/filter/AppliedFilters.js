import {StyleSheet, Text, View} from "react-native";
import React from 'react';
import {Badge} from 'native-base';
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Separator from "../primitives/Separator";

export default class AppliedFilters extends AbstractComponent {
    static styles = StyleSheet.create({
        container: {
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },
    });

    render() {
        const appliedFilters = [...this.props.filters.values()]
            .filter(f => f.isApplied())
            .map((f, idx) =>
                <View key={idx} style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 4}}>
                    <Text style={{
                        fontSize: 14,
                        color: Colors.TextOnPrimaryColor,
                        marginRight: 4
                    }}>{f.label} - {f.selectedOptions.join(', ')} </Text>
                    <Separator/>
                </View>);
        return (
            <View style={AppliedFilters.styles.container}>
                {appliedFilters}
            </View>
        );
    }
}
