import {StyleSheet, Text, View} from "react-native";
import PropTypes from 'prop-types';
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
            alignItems: 'center'
        },
    });

    render() {
        const appliedFilters = [...this.props.filters.values()]
            .filter(f => f.isApplied())
            .map((f, idx) =>
                <View key={idx} style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4}}>
                    <Text style={{fontSize: 14, color: Colors.DefaultPrimaryColor, fontWeight: 'bold', marginRight: 4}}>{f.label}</Text>
                    {f.selectedOptions.map((selectedOption, selectedOptionIndex) => {
                        return <Badge style={{marginRight: 2}} info key={selectedOptionIndex}>{selectedOption}</Badge>
                    })}
                    <Separator/>
                </View>);
        return (
            <View style={AppliedFilters.styles.container}>
                <Text style={{fontSize: 17, color: Colors.DefaultPrimaryColor, fontWeight: 'bold'}}>Applied Filters</Text>
                {appliedFilters}
            </View>
        );
    }
}