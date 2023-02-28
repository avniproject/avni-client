import PropTypes from 'prop-types';
import React from "react";
import BaseFilter from "./BaseFilter";
import RadioLabelValue from "../primitives/RadioLabelValue";
import SelectableItemGroup from "../primitives/SelectableItemGroup";

export default class SingleSelectFilter extends BaseFilter {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        locale: PropTypes.string.isRequired,
        I18n: PropTypes.object.isRequired,
        filter: PropTypes.object,
        onSelect: PropTypes.func,
    };

    render() {
        const {filter, I18n, locale} = this.props;
        const labelValuePairs = filter.options.map(([l, v]) => new RadioLabelValue(l, v));
        return <SelectableItemGroup labelValuePairs={labelValuePairs} labelKey={filter.label}
                                 selectionFn={(selectedVal) => filter.isSelected(selectedVal)} onPress={(value) => this.props.onSelect(value)}
                                 I18n={I18n} locale={locale} inPairs={true} multiSelect={false} mandatory={false}/>;
    }
}
