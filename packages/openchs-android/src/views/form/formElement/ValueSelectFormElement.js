import React from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import RadioLabelValue from "../../primitives/RadioLabelValue";
import {View} from "react-native";
import Distances from "../../primitives/Distances";
import _ from "lodash";
import UserInfoService from "../../../service/UserInfoService";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";

class ValueSelectFormElement extends AbstractFormElement {
    static propTypes = {
        values: PropTypes.array
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const valueLabelPairs = this.props.values.map((value) => new RadioLabelValue(value, value));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <SelectableItemGroup
                    allowRadioUnselect={true}
                    multiSelect={false}
                    inPairs={true}
                    locale={currentLocale}
                    I18n={this.I18n}
                    onPress={(value) => this.props.onPress(value)}
                    selectionFn={(value) => _.toString(this.props.value.getValue()) === value}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                    style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                />
            </View>);
    }
}

export default ValueSelectFormElement
