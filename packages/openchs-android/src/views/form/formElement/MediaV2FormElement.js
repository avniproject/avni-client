import {PermissionsAndroid, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import ExpandableMedia from "../../common/ExpandableMedia";
import FileSystem from "../../../model/FileSystem";
import _ from "lodash";
import ExifReader from "../../../../node_modules/exifreader/src/exif-reader";
import {decode} from 'base64-arraybuffer';
import {launchCamera, launchImageLibrary} from "react-native-image-picker";
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import ValidationErrorMessage from "../ValidationErrorMessage";
import DeviceInfo from "react-native-device-info";

const styles = StyleSheet.create({
    icon: {
        color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 36,
    }, closeIcon: {
        color: '#ff0000',
    }, contentRow: {
        flexDirection: 'row', alignItems: 'center', height: 40, marginTop: 16
    }, imageRow: {
        justifyContent: 'space-between'
    }
});

const Mode = {
    MediaLibrary: "MediaLibrary", Camera: "Camera"
};

const DEFAULT_IMG_WIDTH = 1280;
const DEFAULT_IMG_HEIGHT = 960;
const DEFAULT_IMG_QUALITY = 1;
const DEFAULT_VIDEO_QUALITY = 'high';
const DEFAULT_DURATION_LIMIT = 60;

export default class MediaV2FormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        extraStyle: PropTypes.object,
        isShown: PropTypes.bool,
    };
    static defaultProps = {
        style: {}, isShown: true
    };

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }


    componentDidMount() {
        DeviceInfo.isLocationEnabled()
            .then(systemLocationEnabled => this.setState(state => ({...state, systemLocationEnabled})));
    }

    get isImage() {
        return this.props.element.concept.datatype === 'ImageV2';
    }

    get isVideo() {
        return this.props.element.concept.datatype === 'VideoV2';
    }

    addMediaFromPicker(response, onUpdateObservations) {
        if (!response.didCancel && !response.errorCode) {
            const directory = FileSystem.getImagesDir();
            const fileSystemAction = this.state.mode === Mode.Camera ? fs.moveFile : fs.copyFile;
            _.get(response, 'assets').map(asset => {
                const ext = asset.uri.split('.').pop();
                const fileName = `${General.randomUUID()}.${ext}`;
                let tags;
                if (asset.base64) {
                    const fileBuffer = decode(asset.base64)
                    tags = ExifReader.load(fileBuffer, {expanded: true});
                }
                fileSystemAction(asset.uri, `${directory}/${fileName}`)
                    .then(() => onUpdateObservations([this.populateImageMetadata(fileName, tags)]));
            });
        }
    }

    populateImageMetadata(fileName, tags) {
        return {
            uri: fileName,
            latitude: _.get(tags, 'gps.Latitude'),
            longitude: _.get(tags, 'gps.Longitude'),
            deviceModel: _.get(tags, 'exif.Model.description'),
            deviceMake: _.get(tags, 'exif.Make.description')
        }
    }

    getFromKeyValue(key, defaultVal) {
        let keyVal = this.props.element.keyValues.find(keyVal => keyVal.key === key);
        let value = keyVal ? keyVal.getValue() : defaultVal;
        if (key === 'videoQuality' && ['low', 'high'].indexOf(value) === -1)
            throw Error("videoQuality must be either of 'low' or 'high'");
        return value;
    }

    getFromConceptKeyValue(key, defaultVal) {
        let keyVal = this.props.element.concept.keyValues.find(keyVal => keyVal.key === key);
        let value = keyVal ? keyVal.getValue() : defaultVal;
        return value;
    }

    includeExif() {
        return this.isImage && this.getFromConceptKeyValue('captureLocationInformation', false)
    }

    async launchCamera(onUpdateObservations) {
        this.setState(state => ({...state, mode: Mode.Camera}));

        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
            maxWidth: this.getFromKeyValue('maxWidth', DEFAULT_IMG_WIDTH),
            maxHeight: this.getFromKeyValue('maxHeight', DEFAULT_IMG_HEIGHT),
            quality: this.getFromKeyValue('imageQuality', DEFAULT_IMG_QUALITY),
            videoQuality: this.getFromKeyValue('videoQuality', DEFAULT_VIDEO_QUALITY),
            durationLimit: this.getFromKeyValue('durationLimitInSecs', DEFAULT_DURATION_LIMIT),
            includeBase64: this.includeExif()
        };

        if (await this.isPermissionGranted()) {
            launchCamera(options, (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async launchMediaLibrary(onUpdateObservations) {
        this.setState(state => ({...state, mode: Mode.MediaLibrary}));

        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
            selectionLimit: this.props.element.isMultiSelect() ? 0 : 1,
            includeBase64: this.includeExif()
        };

        if (await this.isPermissionGranted()) {
            launchImageLibrary(options, (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async isPermissionGranted() {
        const apiLevel = await DeviceInfo.getApiLevel();

        const permissionRequest = await PermissionsAndroid.requestMultiple(apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL ? [PermissionsAndroid.PERMISSIONS.CAMERA] : [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, PermissionsAndroid.PERMISSIONS.CAMERA]);

        return _.every(permissionRequest, permission => permission === PermissionsAndroid.RESULTS.GRANTED);
    }

    showMedia(mediaObjects, onClearAnswer) {
        return !_.isNil(mediaObjects) && _.map(mediaObjects, mediaObject => {
            const locationPresentInMetadata = !_.isNil(mediaObject.latitude) && !_.isNil(mediaObject.longitude);
            const warningMessage = locationPresentInMetadata ? null : this.state.systemLocationEnabled ? 'Location not found. Enable your camera\'s location and mobile network, then retake the photo. If already enabled, try again.' : 'Enable your mobile and camera location setting, then retake the photo.';
            return (
                <>
                    <View style={[styles.contentRow, styles.imageRow]}>
                        <ExpandableMedia source={mediaObject.uri} type={this.props.element.concept.datatype}/>
                        <TouchableNativeFeedback onPress={() => onClearAnswer()}>
                            <Icon name={"backspace"} style={[styles.icon]}/>
                        </TouchableNativeFeedback>
                    </View>
                    <View>
                        <Text style={{color: Colors.ValidationError}}>{warningMessage && this.I18n.t(warningMessage)}</Text>
                    </View>
                </>)
        });
    }

    showInputOptions(onUpdateObservations) {
        return (<View style={[styles.contentRow, {justifyContent: 'flex-end'}]}>
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
        </View>);
    }

    get mediaObjects() {
        return _.get(this, 'props.value.answer');
    }

    clearAnswer() {
        this.dismissKeyboard();
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            answer: this.mediaObjects,
        });
    }

    onUpdateObservations(mediaObjects) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            value: JSON.stringify(mediaObjects)
        });
    }

    render() {
        return (this.props.isShown && <View style={{marginVertical: 16}}>
            <FormElementLabelWithDocumentation element={this.props.element}/>
            {this.mediaObjects ? this.showMedia(JSON.parse(this.mediaObjects), this.clearAnswer.bind(this)) : this.showInputOptions(this.onUpdateObservations.bind(this))}
            <View
                style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
            <ValidationErrorMessage validationResult={this.props.validationResult}/>
        </View>);
    }
}
