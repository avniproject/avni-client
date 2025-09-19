import PropTypes from "prop-types";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import {StyleSheet, View, Image, TouchableNativeFeedback} from "react-native";
import SignatureCanvas from "react-native-signature-canvas";
import ValidationErrorMessage from "../ValidationErrorMessage";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import Colors from "../../primitives/Colors";
import General from "../../../utility/General";
import _ from "lodash";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { AlertMessage } from "../../common/AlertMessage";
import FileSystem from "../../../model/FileSystem";
import fs from 'react-native-fs';

class SignatureFormElement extends AbstractFormElement {
    static signatureFileDirectory = FileSystem.getImagesDir();
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        scrollRef: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
    }

    get signatureFilename() {
        return this.props.value?.getValue?.() ?? this.props.value?.answer;
    }

    updateValue(signatureValue) {
        if (General.isNilOrEmpty(signatureValue)) {
            this.onUpdateObservations(null);
            return;
        }

        const [header, base64Data] = signatureValue.split(',');
        const mimeType = header.match(/data:(.*?);/)[1];
        const ext = mimeType.split('/')[1];

        const fileName = `${General.randomUUID()}.${ext}`;
        const filePath = `${SignatureFormElement.signatureFileDirectory}/${fileName}`;

        fs.writeFile(filePath, base64Data, 'base64')
            .then(() => {
                this.onUpdateObservations(fileName);
            })
            .catch((error) => {
                AlertMessage(`Error saving signature: ${error.message}`, "error");
            });
    }

    onUpdateObservations(fileName) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            value: fileName,
        });
    }

    clearValue() {
        const prevFile = this.signatureFilename;
        if (prevFile) {
            const prevPath = `${SignatureFormElement.signatureFileDirectory}/${prevFile}`;
            fs.unlink(prevPath).catch(() => {
            });
        }
        this.updateValue(null);
    }

    handleSignatureData = (signature) => {
        this.updateValue(signature);
    };

    handleEmpty = () => {
        this.updateValue(null);
    };

    handleClear = () => {
        this.clearValue();
    };

    handleBegin = () => {
        this.props.scrollRef?.current?.setNativeProps(
            {scrollEnabled: false}
        );
    };
    handleEnd = () => {
        this.props.scrollRef?.current?.setNativeProps(
            {scrollEnabled: true}
        );
    };

    render() {
        return (
            <View style={{marginVertical: 16}}>
                <FormElementLabelWithDocumentation element={this.props.element} />
                {this.signatureFilename ? (
                    <View
                        style={{
                            flexDirection: "row",
                            height: 100,
                            justifyContent: "space-between",
                            paddingHorizontal: 8,
                        }}
                    >
                        <Image
                            resizeMode="center"
                            style={{
                                flex: 1,
                            }}
                            source={{uri: `file://${SignatureFormElement.signatureFileDirectory}/${this.signatureFilename}`}}
                        />
                        <TouchableNativeFeedback onPress={() => this.clearValue()}>
                            <Icon name={"backspace"} style={[styles.icon]} />
                        </TouchableNativeFeedback>
                    </View>
                ) : (
                    <View style={[styles.signatureContainer, {borderColor: this.borderColor}]}>
                        <SignatureCanvas
                            ref={this.signatureRef}
                            onBegin={this.handleBegin}
                            onEnd={this.handleEnd}
                            onOK={this.handleSignatureData}
                            onEmpty={this.handleEmpty}
                            onClear={this.handleClear}
                            autoClear={false}
                            descriptionText={this.I18n.t("signHere")}
                            clearText={this.I18n.t("clear")}
                            confirmText={this.I18n.t("save")}
                        />
                    </View>
                )}
                <View style={styles.lineStyle} />
                <ValidationErrorMessage validationResult={this.props.validationResult} />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor,
        opacity: 0.8,
        alignSelf: "center",
        fontSize: 36,
    },
    lineStyle: {
        flex: 1,
        borderColor: Colors.BlackBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        opacity: 0.1,
    },
    signatureContainer: {
        flex: 1,
        height: 360,
        marginTop: 8,
        backgroundColor: Colors.InputBackground,
        borderWidth: 1,
        borderRadius: 4,
        overflow: "hidden",
    },
});

export default SignatureFormElement;
