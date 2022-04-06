import {TextInput, View} from "react-native";
import {Text} from 'native-base';
import PropTypes from 'prop-types';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Styles from "../../primitives/Styles";
import Colors from "../../primitives/Colors";

class TextFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        multiline: PropTypes.bool.isRequired,
        extraStyle: PropTypes.object,
        keyboardType: PropTypes.string,
        containerStyle: PropTypes.object,
        labelStyle: PropTypes.object,
        inputStyle: PropTypes.object
    };
    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
    }

    renderReadOnly() {
        return (<View style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
            {this.label}
            <Text style={[{
                flex: 1,
                marginVertical: 0,
                paddingVertical: 5
            }, Styles.formBodyText, { color: Colors.InputNormal }]}>
                {_.isNil(this.props.value.getValue()) ? this.I18n.t('Not Known Yet') : _.toString(this.props.value.getValue())}
            </Text>
            <ValidationErrorMessage validationResult={this.props.validationResult}/>
        </View>);
    }

    renderWritable() {
        const containerStyle = _.get(this.props, 'containerStyle', {flexDirection: 'column', justifyContent: 'flex-start'});
        const labelStyle = _.get(this.props, 'labelStyle', {});
        const inputStyle = _.get(this.props, 'inputStyle', {});
        return (
            <View style={containerStyle}>
                <View style={labelStyle}>
                    {this.label}
                </View>
                <View style={inputStyle}>
                    <TextInput {...this.props} style={[Styles.formBodyText, this.props.style]}
                               underlineColorAndroid={this.borderColor} secureTextEntry={this.props.secureTextEntry}
                               value={_.isNil(this.props.value) ? "" : this.props.value.answer}
                               onChangeText={(text) => this.onInputChange(text)} multiline={false}
                               numberOfLines={this.props.multiline ? 4 : 1}
                               keyboardType={this.props.keyboardType || 'default'}/>
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                </View>
            </View>);
    }

    render() {
        return this.props.element.editable === false ? this.renderReadOnly() : this.renderWritable();
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, parentFormElement: this.props.parentElement, value: text});
    }
}

export default TextFormElement;
