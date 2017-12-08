import {TextInput, View} from "react-native";
import React from "react";
import {Text} from "native-base";
import DynamicGlobalStyles from "../../primitives/DynamicGlobalStyles";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Styles from "../../primitives/Styles";

class NumericFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        inputChangeActionName: React.PropTypes.string.isRequired,
        endEditingActionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object,
        validationResult: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    rangeText() {
        let rangeText = null;
        if (!_.isNil(this.props.element.concept.lowNormal)) {
            if (!_.isNil(this.props.element.concept.hiNormal)) {
                rangeText = `${this.props.element.concept.lowNormal} - ${this.props.element.concept.hiNormal}`;
            } else {
                rangeText = `>${this.props.element.concept.lowNormal}`
            }
        } else if (!_.isNil(this.props.element.concept.hiNormal)) {
            rangeText = `<${this.props.element.concept.hiNormal}`
        }
        return _.isNil(rangeText) ? <Text></Text> : <Text style={Styles.formLabel}> ({rangeText}) </Text>;
    }

    unitText() {
        return _.isNil(this.props.element.concept.unit) ? <Text></Text> :
            <Text style={Styles.formLabel}> ({this.props.element.concept.unit}) </Text>;

    }

    onInputChange(text) {
        this.dispatchAction(this.props.inputChangeActionName, {formElement: this.props.element, value: text});
    }

    render() {
        let rangeText = this.rangeText();
        let unitText = this.unitText();
        let labelText = this.label;
        return (
            <View>
                <View style={{backgroundColor: '#ffffff', borderStyle: 'dashed'}}>
                    <Text style={Styles.formLabel}>{labelText}{unitText}{rangeText}</Text>
                </View>
                <View>
                    <TextInput style={[{flex: 1, marginVertical: 0, paddingVertical: 5}, Styles.formBodyText]}
                               underlineColorAndroid={this.borderColor} keyboardType='numeric'
                               value={_.toString(this.props.value.getValue())}
                               onChangeText={(text) => this.onInputChange(text)}
                               onEndEditing={(text) => this.onInputChange(text)}/>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>
        );
    }


}

export default NumericFormElement;