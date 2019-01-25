import {Image, TouchableNativeFeedback, View, StyleSheet, Modal} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import ImagePicker from "react-native-image-picker";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import ExpandableImage from "../../common/ExpandableImage";
import FileSystem from "../../../model/FileSystem";

const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor,
        opacity: 0.8,
        alignSelf: 'center',
        fontSize: 36,
    },
    closeIcon: {
        color: '#ff0000',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        marginTop: 16
    },
    imageRow: {
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
        if (!response.didCancel && !response.error) {
            const fileName = `${General.randomUUID()}.jpg`;
            const imageFilePath = `${FileSystem.getImagesDir()}/${fileName}`;
            fs.moveFile(response.path, imageFilePath)
                .then(this.dispatchAction(this.props.actionName, {
                    formElement: this.props.element,
                    value: fileName
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
                    <Icon name={"backspace"} style={[styles.icon]}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    showInputOptions() {
        return !this.props.value.answer && (
            <View style={[styles.contentRow, {justifyContent: 'flex-end'}]}>
                <TouchableNativeFeedback onPress={() => {
                    this.launchImageLibrary()
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={"file-image"} style={styles.icon}/>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback onPress={() => {
                    this.launchCamera()
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={"camera"} style={styles.icon}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    render() {
        return (
            <View style={{marginVertical: 16}}>
                {this.label}
                {this.showInputOptions()}
                {this.showImage()}
                <View style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}
