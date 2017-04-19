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
                                 onPress={this.toggleFormElementAnswerSelection(possibleAnswer)}/>
    }

    renderMultiSelectAnswers() {
        return (<View style={{
            padding: Distances.ScaledContentDistanceFromEdge,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderStyle: 'dashed',
            flexDirection: 'column',
            borderColor: Colors.InputBorderNormal
        }}>{
            _.chunk(this.props.element.concept.getAnswers(), 2).map(([answer1, answer2], idx) => {
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
            <View style={{flexDirection: 'column'}}>
                <View style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                    <Text style={DynamicGlobalStyles.formElementLabel}>{this.label}</Text>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
                {this.renderMultiSelectAnswers()}
            </View>);
    }

}

export default MultiSelectFormElement;