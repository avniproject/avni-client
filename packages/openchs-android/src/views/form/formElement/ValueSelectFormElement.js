import React from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";
import {View} from "react-native";
import Distances from "../../primitives/Distances";
import _ from "lodash";

class ValueSelectFormElement extends AbstractFormElement {
    static propTypes = {
        values: PropTypes.array
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const valueLabelPairs = this.props.values.map((value) => new RadioLabelValue(value, value));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <RadioGroup
                    multiSelect={false}
                    inPairs={true}
                    onPress={({label, value}) => this.props.onPress(value)}
                    selectionFn={(value) => _.toString(this.props.value.getValue()) === value}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                />
            </View>);
    }
}

export default ValueSelectFormElement
