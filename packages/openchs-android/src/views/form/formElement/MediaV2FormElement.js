import {NativeModules, PermissionsAndroid, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
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
import DeviceLocation from "../../../utility/DeviceLocation";
import {getConnectionInfo} from "../../../utility/ConnectionInfo";
import OrganisationConfigService from "../../../service/OrganisationConfigService";
import {logEvent, firebaseEvents} from "../../../utility/Analytics";

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
            .then(systemLocationEnabled => {
                this.setState(state => ({...state, systemLocationEnabled}));
            });
        DeviceInfo.getAvailableLocationProviders()
            .then((availableLocationProviders) => this.setState(state => ({...state, availableLocationProviders})));
        getConnectionInfo().then(({type, isWifiEnabled, details}) => this.setState(state => ({
            ...state, connectionType: type, isWifiEnabled, cellularGeneration: _.get(details, 'cellularGeneration')
        })));
    }

    get isImage() {
        return this.props.element.concept.datatype === 'ImageV2';
    }

    get isVideo() {
        return this.props.element.concept.datatype === 'VideoV2';
    }

    // Camera usability enhancement (Phase 3). True only when all of:
    //  - this is a photo question (the native screen doesn't support video capture — CameraX is
    //    wired up for ImageCapture only, see CameraCaptureActivity.kt),
    //  - NativeModules.CameraModule actually exists, i.e. this is a tanuh build (CameraModule/
    //    CameraPackage live in src/tanuh/ and are simply absent from every other flavour's
    //    compiled output), and
    //  - the organisation has opted in via the server-synced OrganisationConfig flag.
    // Everyone else (all non-tanuh flavours, and tanuh orgs that haven't opted in) falls through
    // to the existing react-native-image-picker launchCamera() path, completely unchanged.
    useNativeCameraScreen() {
        return this.isImage && !!NativeModules.CameraModule
            && this.getService(OrganisationConfigService).isNativeCameraEnabled();
    }

    addMediaFromPicker(response, onUpdateObservations) {
        if (!response.didCancel && !response.errorCode) {
            const directory = FileSystem.getImagesDir();
            const fileSystemAction = this.state.mode === Mode.Camera ? fs.moveFile : fs.copyFile;
            _.get(response, 'assets').map(asset => {
                // General.logDebugTemp('addMediaFromPicker asset', _.omit(asset, ['base64']));
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
            mode: this.state.mode,
            systemLocationEnabled: this.state.systemLocationEnabled,
            availableLocationProviders: this.state.availableLocationProviders,
            connectionType: this.state.connectionType,
            wifiEnabled: this.state.isWifiEnabled,
            cellularGeneration: this.state.cellularGeneration,
            latitude: _.get(tags, 'gps.Latitude') || _.get(this.state.deviceLocation, 'coords.latitude'),
            longitude: _.get(tags, 'gps.Longitude') || _.get(this.state.deviceLocation, 'coords.longitude'),
            locationInExif: !_.isNil(_.get(tags, 'gps.Latitude')),
            locationAccuracy: _.get(this.state.deviceLocation, 'coords.accuracy'),
            gpsDOP: _.get(tags, 'exif.GPSDOP.description'),
            gpsProcessingMethod: _.get(tags, 'exif.GPSProcessingMethod.description'),
            deviceModel: _.get(tags, 'exif.Model.description') || DeviceInfo.getModel(),
            deviceMake: _.get(tags, 'exif.Make.description') || DeviceInfo.getBrand()
        }
    }

    getFromKeyValue(key, defaultVal) {
        let keyVal = this.props.element.keyValues.find(keyVal => keyVal.key === key);
        let value = keyVal ? keyVal.getValue() : defaultVal;
        if (key === 'videoQuality' && ['low', 'high'].indexOf(value) === -1) throw Error("videoQuality must be either of 'low' or 'high'");
        return value;
    }

    getFromConceptKeyValue(key, defaultVal) {
        let keyVal = this.props.element.concept.keyValues.find(keyVal => keyVal.key === key);
        let value = keyVal ? keyVal.getValue() : defaultVal;
        return value;
    }

    includeLocationInfo() {
        const locationCaptureEnabled = this.isImage && this.getFromConceptKeyValue('captureLocationInformation', false);
        General.logDebug('MV2FE.includeLocationInfo', locationCaptureEnabled);
        return locationCaptureEnabled;
    }

    debouncedGetPosition = _.debounce((callback) => {
        DeviceLocation.getPosition(callback, true, null, this.context);
    }, 1000, {leading: true, trailing: false});

    async launchCamera(onUpdateObservations) {
        this.setState(state => ({...state, mode: Mode.Camera}));
        const includeLocationInfoValue = this.includeLocationInfo();
        if (includeLocationInfoValue) {
            this.debouncedGetPosition((position) => this.setState(state => ({...state, deviceLocation: position})));
        }

        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
            maxWidth: this.getFromKeyValue('maxWidth', DEFAULT_IMG_WIDTH),
            maxHeight: this.getFromKeyValue('maxHeight', DEFAULT_IMG_HEIGHT),
            quality: this.getFromKeyValue('imageQuality', DEFAULT_IMG_QUALITY),
            videoQuality: this.getFromKeyValue('videoQuality', DEFAULT_VIDEO_QUALITY),
            durationLimit: this.getFromKeyValue('durationLimitInSecs', DEFAULT_DURATION_LIMIT),
            includeBase64: includeLocationInfoValue
        };

        if (await this.isPermissionGranted(includeLocationInfoValue)) {
            if (this.useNativeCameraScreen()) {
                try {
                    // Camera usability enhancement (Phase 2) — CameraModule.launchCamera() now
                    // resolves {uri, quality} | null instead of a plain file path string. `quality`
                    // (blur/brightness/contrast/noise scoring from OpenCVUtils.kt/
                    // ImageQualityAnalyzer.kt) is logged to Firebase Analytics here rather than
                    // gating anything client-side beyond the soft retake prompt the native screen
                    // itself already showed (camera master doc, Section 8 decision #1/#2).
                    const result = await NativeModules.CameraModule.launchCamera();
                    if (result && result.uri) {
                        this.addMediaFromPicker({assets: [{uri: `file://${result.uri}`}]}, onUpdateObservations);
                        if (result.quality) {
                            logEvent(firebaseEvents.CAMERA_PHOTO_QUALITY, result.quality);
                        }
                    }
                    // result is null when the user cancelled inside the native screen (closed
                    // it, or denied the permission it separately re-checks) — a no-op, matching
                    // react-native-image-picker's didCancel behaviour in the branch below.
                } catch (error) {
                    General.logError('MediaV2FormElement.launchCamera (native)', error);
                }
            } else {
                launchCamera(options, (response) => this.addMediaFromPicker(response, onUpdateObservations));
            }
        }
    }

    async launchMediaLibrary(onUpdateObservations) {
        this.setState(state => ({...state, mode: Mode.MediaLibrary, deviceLocation: null}));

        const includeLocationInfoValue = this.includeLocationInfo();
        const options = {
            mediaType: this.isVideo ? 'video' : 'photo',
            selectionLimit: this.props.element.isMultiSelect() ? 0 : 1,
            includeBase64: includeLocationInfoValue
        };

        if (await this.isPermissionGranted(includeLocationInfoValue)) {
            launchImageLibrary(options, (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    async isPermissionGranted(includeLocationInfoValue) {
        const apiLevel = await DeviceInfo.getApiLevel();
        const aboveStoragePermissionsDeprecationAPILevel = [PermissionsAndroid.PERMISSIONS.CAMERA];
        const belowStoragePermissionsDeprecationAPILevel = [PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, PermissionsAndroid.PERMISSIONS.CAMERA];
        const permissions = (apiLevel >= General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL) ? aboveStoragePermissionsDeprecationAPILevel : belowStoragePermissionsDeprecationAPILevel;
        const accessLocationPermissions = [PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
        includeLocationInfoValue && permissions.push(...accessLocationPermissions);

        const permissionRequest = await PermissionsAndroid.requestMultiple(permissions);

        return _.every(permissionRequest, permission => permission === PermissionsAndroid.RESULTS.GRANTED);
    }

    showMedia(mediaObjects, onClearAnswer) {
        return !_.isNil(mediaObjects) && _.map(mediaObjects, mediaObject => {
            // General.logDebugTemp('MV2FE.showMedia', mediaObject, mediaObject);
            const locationPresentInMetadata = !_.isNil(mediaObject.latitude) && !_.isNil(mediaObject.longitude);
            const warningMessage = locationPresentInMetadata ? null : !this.state.systemLocationEnabled ? 'Location not found. Enable your camera\'s location and mobile network, then retake the photo. If already enabled, try again.' : 'Enable your mobile and camera location setting, then retake the photo. If already enabled, try again.';
            return (<>
                <View style={[styles.contentRow, styles.imageRow]}>
                    <ExpandableMedia source={mediaObject.uri} type={this.props.element.concept.datatype}/>
                    <TouchableNativeFeedback onPress={() => onClearAnswer()}>
                        <Icon name={"backspace-outline"} style={[styles.icon]}/>
                    </TouchableNativeFeedback>
                </View>
                {this.includeLocationInfo() && !_.isNil(warningMessage) && <View>
                    <Text
                        style={{color: Colors.ValidationError}}>{this.I18n.t(warningMessage)}</Text>
                </View>}
            </>)
        });
    }

    showInputOptions(onUpdateObservations) {
        return (<View style={[styles.contentRow, {justifyContent: 'flex-end'}]}>
            {!this.props.element.restrictGalleryUpload && <TouchableNativeFeedback onPress={() => {
                this.launchMediaLibrary(onUpdateObservations)
            }}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <Icon name={'folder-open-outline'} style={styles.icon}/>
            </TouchableNativeFeedback>}
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
