import {Text, TouchableNativeFeedback, View, Modal, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRScanner from "../form/formElement/QRScanner";
import _ from "lodash";
import Styles from "../primitives/Styles";

class QRSearchFormElement extends AbstractComponent {
    static propTypes = {
        actionName: PropTypes.string.isRequired,
        value: PropTypes.string,
        style: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            showQRScanner: false
        };
    }

    displayValue() {
        return _.isNil(this.props.value) || this.props.value === ''
            ? this.I18n.t('tapToScanQR')
            : this.props.value;
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
        this.dispatchAction(this.props.actionName, {
            value: value
        });
    }

    removeValue() {
        this.notifyChange('');
    }

    renderRemoveButton() {
        const hasValue = !_.isNil(this.props.value) && this.props.value !== '';
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
        const hasValue = !_.isNil(this.props.value) && this.props.value !== '';

        return (
            <View style={this.props.style}>
                <Text style={Styles.formLabel}>{this.I18n.t('scanQRCode')}</Text>
                <View style={{flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center'}}>
                    <TouchableNativeFeedback onPress={() => this.openQRScanner()}
                                             background={TouchableNativeFeedback.SelectableBackground()}>
                        <View style={styles.qrInputContainer}>
                            <Icon name="qrcode-scan"
                                  style={[styles.qrIcon, {color: hasValue ? Colors.AccentColor : Colors.InputBorderNormal}]}/>
                            <Text style={[
                                styles.qrText,
                                {
                                    color: hasValue ? Colors.InputNormal : Colors.InputBorderNormal,
                                    fontStyle: hasValue ? 'normal' : 'italic'
                                }
                            ]}>
                                {this.displayValue()}
                            </Text>
                        </View>
                    </TouchableNativeFeedback>
                    {this.renderRemoveButton()}
                </View>

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

export default QRSearchFormElement;
