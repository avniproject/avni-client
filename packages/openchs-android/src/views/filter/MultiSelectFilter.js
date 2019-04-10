import PropTypes from 'prop-types';
import React from "react";
import {Text, View} from 'react-native';
import BaseFilter from "./BaseFilter";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";

export default class MultiSelectFilter extends BaseFilter {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        const filter = this.props.filter;
        const labelValuePairs = filter.options.map(([l, v]) => new RadioLabelValue(l, v));
        return (
            <View>
                <RadioGroup labelKey={filter.label}
                            labelValuePairs={labelValuePairs}
                            multiSelect={true}
                            onPress={(rlv) => this.props.onSelect(rlv.value)}
                            selectionFn={(selectedVal) => filter.isSelected(selectedVal)}
                            mandatory={false} inPairs={true}/>
            </View>);
    }
}