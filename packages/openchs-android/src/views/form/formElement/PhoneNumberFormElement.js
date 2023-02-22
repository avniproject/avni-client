import AbstractFormElement from "./AbstractFormElement";
import React from "react";
import PropTypes from "prop-types";
import {StyleSheet, TextInput, View} from "react-native";
import Styles from "../../primitives/Styles";
import _ from "lodash";
import ValidationErrorMessage from "../ValidationErrorMessage";
import {Button, Text} from "native-base";
import Colors from "../../primitives/Colors";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import CHSNavigator from "../../../utility/CHSNavigator";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";

class PhoneNumberFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        inputChangeActionName: PropTypes.string.isRequired,
        successVerificationActionName: PropTypes.string.isRequired,
        skipVerificationActionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(this.props.skipVerificationActionName, {observation: this.props.observation, skipVerification: false, parentFormElement: this.props.parentElement, questionGroupIndex: this.props.questionGroupIndex, formElement: this.props.element});
        return super.UNSAFE_componentWillMount();
    }

    onInputChange(number) {
        this.dispatchAction(this.props.inputChangeActionName, {formElement: this.props.element, value: number, parentFormElement: this.props.parentElement, questionGroupIndex: this.props.questionGroupIndex});
    }

    renderVerifyButton() {
        const onSuccess = () => this.dispatchAction(this.props.successVerificationActionName, {observation: this.props.observation, parentFormElement: this.props.parentElement, questionGroupIndex: this.props.questionGroupIndex, formElement: this.props.element});
        const onSkip = () => this.dispatchAction(this.props.skipVerificationActionName, {observation: this.props.observation, skipVerification: true, parentFormElement: this.props.parentElement, questionGroupIndex: this.props.questionGroupIndex, formElement: this.props.element});
        return (
            <View style={styles.skipButtonContainer}>
                <Button primary
                        style={{height:40}}
                        onPress={() => CHSNavigator.navigateToPhoneNumberVerificationView(this, () => this.goBack(), this.props.observation, onSuccess, onSkip)}>
                    <Text>{`${this.I18n.t('verifyNumber')}`}</Text>
                </Button>
            </View>
        )
    }

    render() {
        const value = this.props.value;
        const isVerified = value.isVerified();
        const isUnverified = _.get(this.props.validationResult, 'success', true) && !isVerified && _.size(value.getValue()) === 10;
        return (<View>
            <View style={styles.container}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
            </View>
            <View style={styles.textContainerStyle}>
                <TextInput
                    style={[styles.textStyle, Styles.formBodyText]}
                    underlineColorAndroid={this.borderColor}
                    keyboardType='numeric'
                    value={_.toString(value.getValue())}
                    onChangeText={(number) => this.onInputChange(number)}
                />
                {isUnverified && this.renderVerifyButton(value)}
                {isVerified &&
                <MCIIcon name={'shield-check'} style={styles.verifiedIconStyle}/>}
            </View>
            {isUnverified &&
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
    },
    skipButtonContainer: {
        marginBottom: 15
    }
});
