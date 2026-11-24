import PropTypes from "prop-types";
import React from "react";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import _ from "lodash";
import AbstractComponent from "../../../framework/view/AbstractComponent";
import Colors from "../../primitives/Colors";
import DeviceReadingSheet from "./DeviceReadingSheet";
import {deviceDetailsText, numericValue} from "../../../utility/anupath/AnuPathDevice";

// Which questions the reading fills is decided by form-element key-values (see AnuPathFields.js).
export {deviceTestFor, isAnuPathDetailsElement} from "../../../utility/anupath/AnuPathFields";

/**
 * "Get reading from device" under a device-value question. Opens the anuPath bottom sheet and, on
 * "Accept", writes the value and the device details into their (read-only) questions.
 */
class DeviceReadingButton extends AbstractComponent {
    static propTypes = {
        testName: PropTypes.string.isRequired,
        valueElement: PropTypes.object.isRequired,
        detailsElement: PropTypes.object,
        hasValue: PropTypes.bool,
        actions: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.state = {sheetVisible: false};
    }

    // The value and the device details are written together or not at all: a record whose value is not a
    // number is refused (the sheet does not offer Accept for it), so the details can never describe a
    // different test from the value. The value is written first, then the details.
    onUse(record, deviceInfo) {
        const {valueElement, detailsElement, actions} = this.props;
        const value = numericValue(record);
        if (_.isNil(value)) {
            if (__DEV__) console.log(`[anuPath] Not accepted: value "${_.get(record, "value")}" is not a number`);
            return;
        }
        this.dispatchAction(actions["PRIMITIVE_VALUE_CHANGE"], {
            formElement: valueElement,
            value: _.toString(value),
            convertToNumber: true
        });
        // Saved even when the server hides the "Device details" question (hidden concept): it is
        // stored and synced, just not drawn.
        const details = deviceDetailsText(deviceInfo, record);
        if (detailsElement) {
            this.dispatchAction(actions["PRIMITIVE_VALUE_CHANGE"], {
                formElement: detailsElement,
                value: details
            });
        }
        if (__DEV__) console.log(`[anuPath] Device details ${detailsElement ? `saved to "${detailsElement.name}"` : "NOT saved (no Device details question after the value)"}: ${details}`);
    }

    render() {
        const label = this.props.hasValue ? this.I18n.t("Read again from device") : this.I18n.t("Get reading from device");
        return (
            <View>
                <TouchableOpacity activeOpacity={0.8} style={styles.button} onPress={() => this.setState({sheetVisible: true})}>
                    <Icon name="bluetooth" size={20} color={Colors.BrandPrimaryDark}/>
                    <Text style={styles.text}>{label}</Text>
                </TouchableOpacity>
                <DeviceReadingSheet visible={this.state.sheetVisible}
                                    testName={this.props.testName}
                                    I18n={this.I18n}
                                    onUse={(record, deviceInfo) => this.onUse(record, deviceInfo)}
                                    onClose={() => this.setState({sheetVisible: false})}/>
            </View>
        );
    }
}

export default DeviceReadingButton;

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.BrandPrimaryDark,
        backgroundColor: Colors.WhiteContentBackground
    },
    text: {marginLeft: 8, fontSize: 15, fontWeight: "600", color: Colors.BrandPrimaryDark}
});
