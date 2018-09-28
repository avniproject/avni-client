import React from "react";
import {View, StyleSheet, ListView, Text} from 'react-native';
import {Button} from 'native-base';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import Separator from '../primitives/Separator';
import SingleSelectFilter from './SingleSelectFilter';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import FilterService from "../../service/FilterService";
import Filter from "openchs-models/src/application/Filter";
import Colors from "../primitives/Colors";

class FilterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "FilterView";
    }

    constructor(props, context) {
        super(props, context);
        this.filterMap = new Map([[Filter.types.SingleSelect, SingleSelectFilter]]);
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge
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
        const filters = [...this.props.filters.values()].map((f, idx) => this.renderFilter(f, idx));
        return (
            <View style={FilterView.styles.container}>
                <Text style={{color: Colors.DefaultPrimaryColor, fontSize: 20}}>Filter Individuals</Text>
                {filters}
                <Button block onPress={this.props.applyFn}>Apply</Button>
            </View>
        );
    }
}

export default FilterView;