import React from "react";
import {View, Text} from 'react-native';
import BaseFilter from "./BaseFilter";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import General from "../../utility/General";


export default class SingleSelectFilter extends BaseFilter {
    constructor(props, context) {
        super(props, context);
    }

    render() {
        const filter = this.props.filter;
        const labelValuePairs = filter.options.map(([l, v]) => new RadioLabelValue(l, v));
        return (
                <RadioGroup labelKey={filter.label}
                            labelValuePairs={labelValuePairs}
                            multiSelect={false}
                            onPress={(rlv) => this.props.onSelect(rlv.value)}
                            selectionFn={(selectedVal) => filter.isSelected(selectedVal)}
                            mandatory={false} inPairs={false}/>);
    }
}