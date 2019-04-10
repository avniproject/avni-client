import PropTypes from 'prop-types';
import React from "react";
import {ListView, StyleSheet, Text, View, Dimensions} from 'react-native';
import {Button} from 'native-base';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import SingleSelectFilter from './SingleSelectFilter';
import MultiSelectFilter from './MultiSelectFilter';
import {  Filter  } from 'openchs-models';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";

class FilterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FilterView";
    }

    constructor(props, context) {
        super(props, context);
        this.filterMap = new Map([[Filter.types.SingleSelect, SingleSelectFilter],
            [Filter.types.MultiSelect, MultiSelectFilter]]);
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge,
            padding: 10,
            backgroundColor: Styles.whiteColor
        }
    });

    onSelect(filter) {
        return (val) => {
            const m = filter.selectOption(val);
            return this.props.onSelect(m);
        }
    }

    renderFilter(filter, idx) {
        const Elem = this.filterMap.get(filter.type);
        return (
            <View key={idx}>
                <Elem filter={filter} onSelect={this.onSelect(filter)}/>
            </View>)
    }

    render() {
        const {width} = Dimensions.get('window');
        const filters = [...this.props.filters.values()].map((f, idx) => this.renderFilter(f, idx));
        return (
            <View style={[FilterView.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                <Text style={{color: Colors.DefaultPrimaryColor, fontSize: 26, marginBottom: 10}}>Filter Individuals</Text>
                {filters}
                <Button block onPress={this.props.applyFn}>Apply</Button>
            </View>
        );
    }
}

export default FilterView;