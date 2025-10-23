import {Text, TouchableNativeFeedback, View, Modal, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../ValidationErrorMessage";
import Colors from "../../primitives/Colors";
import Fonts from "../../primitives/Fonts";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRScanner from "./QRScanner";
import _ from "lodash";

class QRFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            showQRScanner: false
        };
    }

    displayValue() {
        const value = this.props.value.getValue();
        return _.isNil(value) || value === ''
            ? this.I18n.t('tapToScanQR')
            : value;
    }

    openQRScanner() {
        this.setState({ showQRScanner: true });
    }

    onQRRead(qrValue) {
        this.setState({ showQRScanner: false });
        if (qrValue) {
            this.notifyChange(qrValue);
        }
    }

    notifyChange(value) {
        this.props.value.answer = value;
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            value: value
        });
    }

    removeValue() {
        this.notifyChange(null);
    }

    renderRemoveButton() {
        const hasValue = !_.isNil(this.props.value.getValue()) && this.props.value.getValue() !== '';
        if (hasValue) {
            return (
                <TouchableNativeFeedback onPress={() => this.removeValue()}
                                         background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                                         useForeground>
                    <Icon name="backspace"
                          style={{marginLeft: 8, fontSize: 20, color: Colors.AccentColor}}/>
                </TouchableNativeFeedback>
            );
        }
        return null;
    }

    render() {
        const hasValue = !_.isNil(this.props.value.getValue()) && this.props.value.getValue() !== '';

        return (
            <View>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                    <TouchableNativeFeedback onPress={() => this.openQRScanner()}
                                             background={TouchableNativeFeedback.SelectableBackground()}>
                        <View style={styles.qrInputContainer}>
                            <Icon name="qrcode-scan"
                                  style={[styles.qrIcon, {color: hasValue ? Colors.AccentColor : Colors.InputBorderNormal}]}/>
                            <Text style={[
                                styles.qrText,
                                {
                                    color: _.isNil(this.props.validationResult) ?
                                        (hasValue ? Colors.InputNormal : Colors.InputBorderNormal) :
                                        Colors.ValidationError,
                                    fontStyle: hasValue ? 'normal' : 'italic'
                                }
                            ]}>
                                {this.displayValue()}
                            </Text>
                        </View>
                    </TouchableNativeFeedback>
                    {this.renderRemoveButton()}
                </View>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>

                <Modal
                    visible={this.state.showQRScanner}
                    animationType="slide"
                    onRequestClose={() => this.onQRRead(null)}>
                    <QRScanner onRead={(qrValue) => this.onQRRead(qrValue)} />
                </Modal>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    qrInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: Colors.GreyContentBackground,
        flex: 1,
        minHeight: 44
    },
    qrIcon: {
        fontSize: 20,
        marginRight: 8
    },
    qrText: {
        fontSize: Fonts.Large,
        flex: 1
    }
});

export default QRFormElement;
