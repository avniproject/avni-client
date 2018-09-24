import {TextInput, View} from "react-native";
import {Text} from 'native-base';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import Styles from "../../primitives/Styles";
import Colors from "../../primitives/Colors";

class TextFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        multiline: React.PropTypes.bool.isRequired,
        extraStyle: React.PropTypes.object
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
        </View>);
    }

    renderWritable() {
        return (
            <View style={{flexDirection: 'column', justifyContent: 'flex-start'}}>
                {this.label}
                <TextInput {...this.props} style={[Styles.formBodyText, this.props.style]} underlineColorAndroid={this.borderColor} secureTextEntry={this.props.secureTextEntry}
                           value={_.isNil(this.props.value) ? "" : this.props.value.answer} onChangeText={(text) => this.onInputChange(text)} multiline={false} numberOfLines={this.props.multiline ? 4 : 1}/>

                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>);
    }

    render() {
        return this.props.element.editable === false ? this.renderReadOnly() : this.renderWritable();
    }

    onInputChange(text) {
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, value: text});
    }
}

export default TextFormElement;