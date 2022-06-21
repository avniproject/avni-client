import {StyleSheet, TouchableNativeFeedback, View, PermissionsAndroid} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import {launchCamera, launchImageLibrary} from "react-native-image-picker";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import ExpandableMedia from "../../common/ExpandableMedia";
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

const Mode = {
    MediaLibrary: "MediaLibrary",
    Camera: "Camera"
};

const DEFAULT_IMG_WIDTH = 1280;
const DEFAULT_IMG_HEIGHT = 960;
const DEFAULT_IMG_QUALITY = 1;
const DEFAULT_VIDEO_QUALITY = 'high';
const DEFAULT_DURATION_LIMIT = 60;

export default class MediaFormElement extends AbstractFormElement {
    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    get isVideo() {
        return this.props.element.concept.datatype === 'Video';
    }

    get isImage() {
        return this.props.element.concept.datatype === 'Image'
            || this.props.element.concept.datatype === 'Profile-Pics';
    }

    get label() {
        let label = super.label;
        if (this.isVideo) {
            let duration = this.getFromKeyValue('durationLimitInSecs', DEFAULT_DURATION_LIMIT);
            let durationSuffix = duration > 60 ? `(` + this.I18n.t(`Upto ${Math.floor(duration / 60)} min ${duration % 60} sec`) + `)` : `(` + this.I18n.t(`Upto ${duration} sec`) + `)`;
            return React.cloneElement(label, {}, [...label.props.children, durationSuffix]);
        }
        return label;
    }

    addMediaFromPicker(response, onUpdateObservations) {
        if (!response.didCancel && !response.errorCode) {
            const ext = this.isVideo ? 'mp4' : 'jpg';
            const fileName = `${General.randomUUID()}.${ext}`;
            const directory = this.isVideo ? FileSystem.getVideosDir() :
                (this.props.element.name === "profilePicture" ? FileSystem.getProfilePicsDir() : FileSystem.getImagesDir());
            const fileSystemAction = this.state.mode === Mode.Camera ? fs.moveFile : fs.copyFile;
            if (_.get(response, 'assets[0]')) {
                fileSystemAction(response.assets[0].uri, `${directory}/${fileName}`)
                    .then(() => onUpdateObservations(fileName));
            }
        }
    }

    getFromKeyValue(key, defaultVal) {
        let keyVal = this.props.element.keyValues.find(keyVal => keyVal.key === key);
        let value = keyVal ? keyVal.getValue() : defaultVal;
        if (key === 'videoQuality' && ['low', 'high'].indexOf(value) === -1)
            throw Error("videoQuality must be either of 'low' or 'high'");
        return value;
    }

    async launchCamera(onUpdateObservations) {
        this.setState({mode: Mode.Camera});

        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
            maxWidth: this.getFromKeyValue('maxWidth', DEFAULT_IMG_WIDTH),
            maxHeight: this.getFromKeyValue('maxHeight', DEFAULT_IMG_HEIGHT),
            quality: this.getFromKeyValue('imageQuality', DEFAULT_IMG_QUALITY),
            videoQuality: this.getFromKeyValue('videoQuality', DEFAULT_VIDEO_QUALITY),
            durationLimit: this.getFromKeyValue('durationLimitInSecs', DEFAULT_DURATION_LIMIT)
        };
        if (await this.isPermissionGranted()) {
            launchCamera(options,
                (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async launchMediaLibrary(onUpdateObservations) {
        this.setState({mode: Mode.MediaLibrary});

        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
        };
        if (await this.isPermissionGranted()) {
            launchImageLibrary(options,
                (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async isPermissionGranted() {
        const readStoragePermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const writeStoragePermission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
        const cameraPermission = PermissionsAndroid.PERMISSIONS.CAMERA;
        const granted = PermissionsAndroid.RESULTS.GRANTED;

        const permissionRequest = await PermissionsAndroid.requestMultiple([readStoragePermission, writeStoragePermission, cameraPermission]);

        return permissionRequest[readStoragePermission] === granted && permissionRequest[writeStoragePermission] === granted
            && permissionRequest[cameraPermission] === granted
    }

    showMedia(mediaUri, onClearAnswer) {
        return (
            <View style={[styles.contentRow, styles.imageRow]}>
                <ExpandableMedia source={mediaUri} type={this.props.element.concept.datatype}/>
                <TouchableNativeFeedback onPress={() => onClearAnswer()}>
                    <Icon name={"backspace"} style={[styles.icon]}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    showInputOptions(onUpdateObservations) {
        return (
            <View style={[styles.contentRow, {justifyContent: 'flex-end'}]}>
                <TouchableNativeFeedback onPress={() => {
                    this.launchMediaLibrary(onUpdateObservations)
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={'folder-open'} style={styles.icon}/>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback onPress={() => {
                    this.launchCamera(onUpdateObservations)
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={this.isImage ? 'camera' : this.isVideo ? 'video' : 'alert-octagon'}
                          style={styles.icon}/>
                </TouchableNativeFeedback>
            </View>
        );
    }
}
