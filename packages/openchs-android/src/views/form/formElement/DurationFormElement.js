import {Text, TextInput, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import DGS from "../../primitives/DynamicGlobalStyles";
import Colors from '../../primitives/Colors';
import Distances from "../../primitives/Distances";
import Styles from "../../primitives/Styles";
import ValidationErrorMessage from "../ValidationErrorMessage";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class DurationFormElement extends AbstractFormElement {
    static propTypes = {
        label: PropTypes.string.isRequired,
        actionName: PropTypes.string.isRequired,
        compositeDuration: PropTypes.object.isRequired,
        validationResult: PropTypes.object,
        element: PropTypes.object.isRequired,
    };

    constructor(props, context) {
        super(props, context);
    }

    onUpdate(duration) {
        return (value) =>
            this.dispatchAction(this.props.actionName, {
                formElement: this.props.element,
                compositeDuration: this.props.compositeDuration.changeValue(duration, value),
                parentFormElement: this.props.parentElement,
                questionGroupIndex: this.props.questionGroupIndex
            });
    }

    renderDuration(duration, idx) {
        return (
            <View key={idx} style={{flexDirection: 'row', marginRight: 10}}>
                <TextInput style={[Styles.formBodyText, {
                    paddingBottom: 5,
                    paddingTop: 0,
                    marginBottom: 5,
                    width: 50,
                    color: Colors.InputNormal
                }]}
                           keyboardType='numeric'
                           underlineColorAndroid={this.borderColor}
                           value={duration.durationValue}
                           onChangeText={this.onUpdate(duration)}/>
                <Text style={DGS.formRadioText}>{this.I18n.t(duration.durationUnit)}</Text>
            </View>);
    }

    render() {
        const compositeDuration = this.props.compositeDuration;
        const durationView = compositeDuration.durations.map((duration, idx) => this.renderDuration(duration, idx));
        return (
            <View>
                <View style={{backgroundColor: '#ffffff', borderStyle: 'dashed', borderRadius: 1,}}>
                    <FormElementLabelWithDocumentation element={this.props.element}/>
                </View>
                <View style={{
                    borderWidth: 1,
                    borderRadius: 1,
                    borderStyle: 'dashed',
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                    paddingTop: 10
                }}>
                    <View style={[{flexDirection: 'row'}]}>
                        <View style={{flexDirection: 'row'}}>
                            {durationView}
                        </View>
                    </View>
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}

export default DurationFormElement;
