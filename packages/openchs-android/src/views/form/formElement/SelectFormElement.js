import {Text, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import Colors from "../../primitives/Colors";
import Distances from "../../primitives/Distances";
import PresetOptionItem from "../../primitives/PresetOptionItem";
import RadioGroup, {RadioLabelValue} from "../../primitives/RadioGroup";

class SelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        isSelected: PropTypes.func.isRequired,
        validationResult: PropTypes.object,
        allowedValues: PropTypes.array
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(value) {
        const answer = this.props.element.getAnswers().find((ans) => ans.concept.uuid === value);
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, answerUUID: answer.concept.uuid, parentFormElement: this.props.parentElement, value: answer.concept.uuid, index: this.props.index});
    }

    getOnlyAllowedAnswers() {
        return this.props.element.getAnswers().filter(answer => _.includes(this.props.allowedValues, answer.concept.uuid))
    }

    getAnswers() {
        return _.isNil(this.props.allowedValues) ? this.props.element.getAnswers() : this.getOnlyAllowedAnswers();
    }

    render() {
        const disabled = this.props.element.editable === false;
        const valueLabelPairs = this.getAnswers()
            .map((answer) => new RadioLabelValue(answer.concept.name, answer.concept.uuid, answer.abnormal));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <RadioGroup
                    multiSelect={this.props.multiSelect}
                    inPairs={true}
                    onPress={({label, value}) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={this.props.isSelected}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                    disabled={disabled}
                />
            </View>);
    }

}

export default SelectFormElement;
