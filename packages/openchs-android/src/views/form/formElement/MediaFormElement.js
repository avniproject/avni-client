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
import DeviceInfo from 'react-native-device-info';
import _ from "lodash";

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
            const directory = this.isVideo ? FileSystem.getVideosDir() :
                (this.props.element.name === "profilePicture" ? FileSystem.getProfilePicsDir() : FileSystem.getImagesDir());
            const fileSystemAction = this.state.mode === Mode.Camera ? fs.moveFile : fs.copyFile;
            _.get(response, 'assets').map(asset => {
                const ext = asset.uri.split('.').pop();
                const fileName = `${General.randomUUID()}.${ext}`;
                fileSystemAction(asset.uri, `${directory}/${fileName}`)
                    .then(() => onUpdateObservations(fileName));
            });
        }
    }


    getFromKeyValue(key, defaultVal) {
        let keyVal = this.props.element.keyValues.find(keyVal => keyVal.key === key);
        let value = keyVal ? keyVal.getValue() : defaultVal;
        if (key === 'videoQuality') {
            const videoQualityIndex = ['low', 'high'].indexOf(value);
            if(videoQualityIndex === -1) {
                throw Error("videoQuality must be either of 'low' or 'high'");
            } else {
                /**
                 * https://developer.android.com/reference/android/provider/MediaStore#EXTRA_VIDEO_QUALITY
                 *
                 * The name of the Intent-extra used to control the quality of a recorded video.
                 * This is an integer property. Currently value 0 means low quality, suitable for MMS messages,
                 * and value 1 means high quality. In the future other quality levels may be added.
                 *
                 * Returning "0"/"1" instead of "low"/"high",
                 * as sending "low"/"high" was not altering quality of video-capture, but "0"/"1" did.
                 */
                return videoQualityIndex.toString();
            }
        }

        return value;
    }

    getDefaultOptions() {
        return ({
            mediaType: this.isVideo ? 'video' : 'photo',
            maxWidth: this.getFromKeyValue('maxWidth', DEFAULT_IMG_WIDTH),
            maxHeight: this.getFromKeyValue('maxHeight', DEFAULT_IMG_HEIGHT),
            quality: this.getFromKeyValue('imageQuality', DEFAULT_IMG_QUALITY),
            videoQuality: this.getFromKeyValue('videoQuality', DEFAULT_VIDEO_QUALITY)
        });
    }

    async launchCamera(onUpdateObservations) {
        this.setState({ mode: Mode.Camera });
        const options = { ...this.getDefaultOptions(),
            durationLimit: this.getFromKeyValue('durationLimitInSecs', DEFAULT_DURATION_LIMIT)};
        if (await this.isPermissionGranted()) {
            launchCamera(options,
                (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async launchMediaLibrary(onUpdateObservations) {
        this.setState({mode: Mode.MediaLibrary});
        const isMultiSelect = this.props.element.isMultiSelect ? this.props.element.isMultiSelect() : false;
        const options = { ...this.getDefaultOptions(),
            selectionLimit: isMultiSelect ? 0 : 1
        };
        if (await this.isPermissionGranted()) {
            launchImageLibrary(options,
                (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async isPermissionGranted() {
        const apiLevel = await DeviceInfo.getApiLevel();

        const permissionRequest = await PermissionsAndroid.requestMultiple(
            apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL ?
                [
                    PermissionsAndroid.PERMISSIONS.CAMERA
                ]
                :
                [
                    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    PermissionsAndroid.PERMISSIONS.CAMERA
                ]
        );

        return _.every(permissionRequest, permission => permission === PermissionsAndroid.RESULTS.GRANTED);
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
