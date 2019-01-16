import {Image, TouchableNativeFeedback, View, StyleSheet, Modal} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import ImagePicker from "react-native-image-picker";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import {ImageViewer} from "react-native-image-zoom-viewer";
import ExpandableImage from "../../common/ExpandableImage";

const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor,
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 48,
    },
    closeIcon: {
        color: '#ff0000',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 36,
        marginTop: 16
    },
    imageRow: {
        backgroundColor: Colors.SecondaryActionButtonColor,
        marginHorizontal: 4,
        justifyContent: 'space-between'
    }
});

export default class ImageFormElement extends AbstractFormElement {
    static propTypes = {
        element: React.PropTypes.object.isRequired,
        actionName: React.PropTypes.string.isRequired,
        value: React.PropTypes.object,
        validationResult: React.PropTypes.object,
        extraStyle: React.PropTypes.object
    };
    static defaultProps = {
        style: {}
    };

    constructor(props, context) {
        super(props, context);
    }

    addImageFromPicker(response) {
        fs.mkdir(fs.ExternalStorageDirectoryPath + "/OpenCHS/media/images/");
        if (!response.didCancel && !response.error) {
            const imageFilePath = fs.ExternalStorageDirectoryPath + "/OpenCHS/media/images/" + General.randomUUID() + ".jpg";
            fs.moveFile(response.path, imageFilePath)
                .then(this.dispatchAction(this.props.actionName, {
                    formElement: this.props.element,
                    value: imageFilePath
                }));
        }
    }

    clearAnswer() {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            value: null,
        });
    }

    launchCamera() {
        const options = {
            mediaType: 'photo',
            maxWidth: 1280,
            maxHeight: 960,
            noData: true,
            storageOptions: {
                waitUntilSaved: true,
            }
        };
        ImagePicker.launchCamera(options,
            (response) => this.addImageFromPicker(response)
        );
    }

    launchImageLibrary() {
        ImagePicker.launchImageLibrary({},
            (response) => this.addImageFromPicker(response)
        );
    }


    showImage() {
        return this.props.value.answer && (
            <View style={[styles.contentRow, styles.imageRow]}>
                <ExpandableImage source={this.props.value.answer}/>
                <TouchableNativeFeedback onPress={() => this.clearAnswer()}>
                    <Icon name={"close-box"} style={[styles.icon, styles.closeIcon]}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    showInputOptions() {
        return !this.props.value.answer && (
            <View style={styles.contentRow}>
                <TouchableNativeFeedback onPress={() => {
                    this.launchCamera()
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={"camera"} style={styles.icon}/>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback onPress={() => {
                    this.launchImageLibrary()
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={"file-image"} style={styles.icon}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    render() {
        return (
            <View>
                {this.label}
                {this.showInputOptions()}
                {this.showImage()}
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}
