import PropTypes from 'prop-types';
import React from "react";
import {View, Text} from 'react-native';
import BaseFilter from "./BaseFilter";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";

export default class SingleSelectFilter extends BaseFilter {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        filter: PropTypes.object,
        onSelect: PropTypes.func,
    };

    render() {
        const filter = this.props.filter;
        const labelValuePairs = filter.options.map(([l, v]) => new RadioLabelValue(l, v));
        const locale = this.getService(UserInfoService).getUserSettings().locale;
        return <SelectableItemGroup labelValuePairs={labelValuePairs} labelKey={filter.label}
                                 selectionFn={(selectedVal) => filter.isSelected(selectedVal)} onPress={(value) => this.props.onSelect(value)}
                                 I18n={this.I18n} locale={locale} inPairs={true} multiSelect={false} mandatory={false}/>;
    }
}
