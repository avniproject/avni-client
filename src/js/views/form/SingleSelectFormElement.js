import {Text, View} from "react-native";
import React from "react";
import _ from "lodash";
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import Distances from "../primitives/Distances";
import Colors from "../primitives/Colors";
import PresetOptionItem from "../primitives/PresetOptionItem";

class SingleSelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object.isRequired,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(formElement, answer) {
        return () => {
            this.dispatchAction(this.props.actionName, {formElement: formElement, answerUUID: answer.concept.uuid});
        }
    }

    renderAnswer(answer) {
        return <PresetOptionItem displayText={this.I18n.t(answer.concept.name)} checked={this.props.value.hasValue(answer.concept.uuid)} multiSelect={false}
                                 onPress={this.toggleFormElementAnswerSelection(this.props.element, answer)} validationResult={this.props.validationResult}
                                 style={{flex: 0.5, marginTop: Distances.VerticalSpacingBetweenOptionItems}}/>;
    }

    renderSingleSelectAnswers() {
        return (<View style={{
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderStyle: 'dashed',
            flexDirection: 'column',
            borderColor: Colors.InputBorderNormal,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems
        }}>{
            _.chunk(this.props.element.concept.getAnswers(), 2).map(([answer1, answer2], idx) => {
                return (
                    <View key={idx} style={{flexDirection: 'row'}}>
                        {this.renderAnswer(answer1)}
                        {_.isNil(answer2) ? <View style={{flex: 0.5}}/> : this.renderAnswer(answer2)}
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
                {this.renderSingleSelectAnswers()}
            </View>);
    }
}

export default SingleSelectFormElement;