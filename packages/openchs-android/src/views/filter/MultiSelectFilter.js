import React from "react";
import {View} from 'react-native';
import BaseFilter from "./BaseFilter";
import {RadioLabelValue} from "../primitives/RadioGroup";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import PropTypes from "prop-types";

export default class MultiSelectFilter extends BaseFilter {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        I18n: PropTypes.object.isRequired,
        onSelect: PropTypes.func.isRequired,
        locale: PropTypes.string.isRequired,
        filter: PropTypes.object
    }

    render() {
        const filter = this.props.filter;
        const labelValuePairs = filter.options.map(([l, v]) => new RadioLabelValue(l, v));
        return (
            <View>
                <SelectableItemGroup labelKey={filter.label}
                            labelValuePairs={labelValuePairs}
                            multiSelect={true}
                            onPress={(value) => this.props.onSelect(value)}
                            selectionFn={(selectedVal) => filter.isSelected(selectedVal)}
                            mandatory={false} inPairs={true} locale={this.props.locale} I18n={this.props.I18n}/>
            </View>);
    }
}
