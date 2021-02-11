import AbstractFormElement from "./AbstractFormElement";
import React from "react";
import PropTypes from "prop-types";
import {StyleSheet, TextInput, View} from "react-native";
import Styles from "../../primitives/Styles";
import _ from "lodash";
import ValidationErrorMessage from "../ValidationErrorMessage";
import {Text} from "native-base";
import Colors from "../../primitives/Colors";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";

class PhoneNumberFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        inputChangeActionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
    }

    onInputChange(number) {
        this.dispatchAction(this.props.inputChangeActionName, {formElement: this.props.element, value: number});
    }

    render() {
        const value = this.props.value;
        const isVerified = value.isVerified();
        const renderUnverified = !isVerified && _.size(value.getValue()) === 10;
        return (<View>
            <View style={styles.container}>
                <Text style={Styles.formLabel}>{this.label}</Text>
            </View>
            <View style={styles.textContainerStyle}>
                <TextInput
                    style={[styles.textStyle, Styles.formBodyText]}
                    underlineColorAndroid={this.borderColor}
                    keyboardType='numeric'
                    value={_.toString(value.getValue())}
                    onChangeText={(number) => this.onInputChange(number)}
                />
                {renderUnverified &&
                <MCIIcon name={'alert'} style={styles.unverifiedIconStyle}/>}
                {isVerified &&
                <MCIIcon name={'verified'} style={styles.verifiedIconStyle}/>}
            </View>
            {renderUnverified &&
            <Text style={{color: Colors.ValidationError, textAlign: 'right'}}>
                {this.I18n.t("phoneNumberUnverified")}
            </Text>
            }
            <ValidationErrorMessage validationResult={this.props.validationResult}/>
        </View>)
    }
}

export default PhoneNumberFormElement;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderStyle: 'dashed',
        borderRadius: 1
    },
    textContainerStyle: {
        flex: 1, flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textStyle: {
        flex: 1,
        marginVertical: 0,
        paddingVertical: 5,
        color: Colors.InputNormal
    },
    unverifiedIconStyle: {
        color: Colors.ValidationError,
        fontSize: 25,
        paddingBottom: 6,
        marginRight: 5,
    },
    verifiedIconStyle: {
        color: Colors.AccentColor,
        fontSize: 25,
        paddingBottom: 6,
        marginRight: 5,
    }
});
