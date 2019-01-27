import {StyleSheet, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import ImagePicker from "react-native-image-picker";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import ExpandableImage from "../../common/ExpandableImage";
import ExpandableVideo from "../../common/ExpandableVideo";
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

export default class MediaFormElement extends AbstractFormElement {
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

    get isVideo() {
        return this.props.element.concept.datatype === 'Video';
    }

    get isImage() {
        return this.props.element.concept.datatype === 'Image';
    }

    addImageFromPicker(response) {
        if (!response.didCancel && !response.error) {
            const ext = this.isVideo ? 'mp4' : 'jpg';
            const fileName = `${General.randomUUID()}.${ext}`;
            const directory = this.isVideo ? FileSystem.getVideosDir() : FileSystem.getImagesDir();
            fs.moveFile(response.path, `${directory}/${fileName}`)
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
            mediaType: this.isVideo ? 'video' : 'photo',
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
        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
        };
        ImagePicker.launchImageLibrary(options,
            (response) => this.addImageFromPicker(response)
        );
    }


    showImage() {
        return (
            <View style={[styles.contentRow, styles.imageRow]}>
                <ExpandableImage source={this.props.value.answer}/>
                <TouchableNativeFeedback onPress={() => this.clearAnswer()}>
                    <Icon name={"backspace"} style={[styles.icon]}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    showVideo() {
        return (
            <View style={[styles.contentRow, styles.imageRow]}>
                <ExpandableVideo source={this.props.value.answer}/>
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
                    <Icon name={'folder-open'} style={styles.icon}/>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback onPress={() => {
                    this.launchCamera()
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={'camera'} style={styles.icon}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    render() {
        return (
            <View style={{marginVertical: 16}}>
                {this.label}
                {this.showInputOptions()}
                {this.props.value.answer && (this.isVideo ? this.showVideo() : this.showImage())}
                <View
                    style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}
