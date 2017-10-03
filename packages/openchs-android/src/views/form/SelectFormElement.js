import {Text, View} from "react-native";
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import PresetOptionItem from "../primitives/PresetOptionItem";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";

class SelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        multipleCodeValues: React.PropTypes.object.isRequired,
        isSelected: React.PropTypes.func.isRequired,
        validationResult: React.PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(value) {
        const answer = this.props.element.getAnswers().find((ans) => ans.concept.uuid === value);
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, answerUUID: answer.concept.uuid});
    }

    render() {
        const valueLabelPairs = this.props.element.getAnswers()
            .map((answer) => new RadioLabelValue(answer.concept.name, answer.concept.uuid));
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <View style={{backgroundColor: '#ffffff'}}>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
                <RadioGroup
                    multiSelect={this.props.multiSelect}
                    inPairs={true}
                    onPress={({label, value}) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={this.props.isSelected}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    labelValuePairs={valueLabelPairs}/>
            </View>);
    }

}

export default SelectFormElement;