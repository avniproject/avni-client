import {Text, View} from "react-native";
import React from "react";
import _ from "lodash";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Colors from "../primitives/Colors";
import Distances from "../primitives/Distances";
import PresetOptionItem from "../primitives/PresetOptionItem";

class MultiSelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        multipleCodeValues: React.PropTypes.object.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {formElement: this.props.element, answerUUID: answer.concept.uuid});
        }
    }

    renderPossibleAnswer(possibleAnswer) {
        return <PresetOptionItem multiSelect={true} checked={this.props.multipleCodeValues.isAnswerAlreadyPresent(possibleAnswer.concept.uuid)}
                                 displayText={this.I18n.t(possibleAnswer.concept.name)} validationResult={this.props.validationResult}
                                 onPress={this.toggleFormElementAnswerSelection(possibleAnswer)} style={{flex: 0.5, marginTop: Distances.VerticalSpacingBetweenOptionItems}}/>
    }

    renderMultiSelectAnswers() {
        return (<View style={{
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderStyle: 'dashed',
            flexDirection: 'column',
            borderColor: Colors.InputBorderNormal,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems
        }}>{
            _.chunk(this.props.element.getAnswers(), 2).map(([answer1, answer2], idx) => {
                return (
                    <View key={idx} style={{flexDirection: 'row'}}>
                        {this.renderPossibleAnswer(answer1)}
                        {_.isNil(answer2) ? <View style={{flex: 0.5}}/> : this.renderPossibleAnswer(answer2)}
                    </View>
                )
            })
        }
        </View>);
    }

    render() {
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <View style={{backgroundColor: '#ffffff'}}>
                    {this.label}
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
                {this.renderMultiSelectAnswers()}
            </View>);
    }

}

export default MultiSelectFormElement;