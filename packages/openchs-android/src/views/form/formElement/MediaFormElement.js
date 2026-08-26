import {StyleSheet, TouchableNativeFeedback, View, Text, Image} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import {launchCamera, launchImageLibrary} from "react-native-image-picker";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import ExpandableMedia from "../../common/ExpandableMedia";
import FileSystem from "../../../model/FileSystem";
import _ from "lodash";
import DevicePermissions from "../../../utility/DevicePermissions";
import GuidedCameraModal from "./GuidedCameraModal";
import {toPickerResponse, isGuidedCameraEnabled, resizeCapturedImage} from "./GuidedCameraHelper";
import {
    resolveCaptureGuidance,
    decideGuidedRowState,
    probeGuidanceBlobs,
    forgetGuidanceBlob,
    guidanceBlobCacheGeneration,
    toFileUri
} from "../../../model/CaptureGuidance";
import Styles from "../../primitives/Styles";
import ImageResizer from "@bam.tech/react-native-image-resizer";

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
    },
    iconDisabled: {
        opacity: 0.3,
    },
    guidanceLabel: {
        color: Colors.DefaultPrimaryColor,
        fontSize: Styles.smallTextSize,
        fontWeight: '600',
        marginTop: 12,
    },
    reckoner: {
        width: '100%',
        height: 180,
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
    },
    blockedBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.ValidationError,
        backgroundColor: '#FEF2F2',
    },
    blockedIcon: {
        color: Colors.ValidationError,
        fontSize: 18,
        marginRight: 8,
    },
    blockedText: {
        flex: 1,
        color: Colors.ValidationError,
        fontSize: Styles.smallTextSize,
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
        // Explicit false: RN Modal's `visible` defaults to true, so undefined would flash the camera open.
        this.state = {showGuidedCamera: false, guidanceBlobs: {}};
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

    // Returns a promise so the guided path can await the move; a failed move must not look saved.
    addMediaFromPicker(response, onUpdateObservations) {
        if (response.didCancel || response.errorCode) {
            return Promise.resolve();
        }
        const directory = this.isVideo ? FileSystem.getVideosDir() :
            (this.props.element.name === "profilePicture" ? FileSystem.getProfilePicsDir() : FileSystem.getImagesDir());
        const fileSystemAction = this.state.mode === Mode.Camera ? fs.moveFile : fs.copyFile;
        return Promise.all(_.get(response, 'assets').map(asset => {
            const ext = asset.uri.split('.').pop();
            const fileName = `${General.randomUUID()}.${ext}`;
            return fileSystemAction(asset.uri, `${directory}/${fileName}`)
                .then(() => onUpdateObservations(fileName));
        }));
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

    get isGuidedCamera() {
        return isGuidedCameraEnabled(this.isImage, this.getFromKeyValue('guidedCamera', false));
    }

    get guidedCameraLabels() {
        return {
            noBackCamera: this.I18n.t('guidedCameraNoBackCamera'),
            flashRequired: this.I18n.t('guidedCameraFlashRequired'),
            captureFailed: this.I18n.t('guidedCameraCaptureFailed'),
            permissionRequired: this.I18n.t('guidedCameraPermissionRequired'),
            continueWithoutPhoto: this.I18n.t('guidedCameraContinueWithoutPhoto'),
            openSettings: this.I18n.t('Open settings'),
            close: this.I18n.t('closeModal'),
            retake: this.I18n.t('Retake'),
            usePhoto: this.I18n.t('Use photo')
        };
    }

    // Memoised: read five or six times per render, and resolution logs on a bad rule.
    get captureGuidance() {
        const raw = this.props.element.captureGuidance;
        if (this._resolvedGuidanceFor !== raw || _.isNil(this._resolvedGuidance)) {
            this._resolvedGuidanceFor = raw;
            this._resolvedGuidance = resolveCaptureGuidance(raw, FileSystem.getGuidanceDir());
        }
        return this._resolvedGuidance;
    }

    get guidedRowState() {
        return decideGuidedRowState(this.captureGuidance, this.state.guidanceBlobs);
    }

    onViewDidMount() {
        this.probeGuidanceBlobs();
    }

    componentDidUpdate() {
        this.probeGuidanceBlobs();
    }

    // The existence check is async and render is not, so probe once and hold the answer in state.
    probeGuidanceBlobs() {
        if (!this.isGuidedCamera) return; // a plain photo question never touches the filesystem
        const {reckonerPath, overlayPath} = this.captureGuidance;
        if (!reckonerPath && !overlayPath) return;
        // Keyed on paths, not object identity — filterElements clones every cycle. The generation
        // retires this memory on sync, or a row blocked beforehand stays blocked while mounted.
        const key = `${guidanceBlobCacheGeneration()}|${reckonerPath}|${overlayPath}`;
        if (key === this._probedGuidanceKey) return;
        this._probedGuidanceKey = key;
        probeGuidanceBlobs(fs.exists, [reckonerPath, overlayPath])
            .then(probed => this.setState(state => ({guidanceBlobs: {...state.guidanceBlobs, ...probed}})));
    }

    // Undecodable counts as missing, so the row blocks rather than showing an empty frame.
    onGuidanceImageError(path) {
        if (!path) return;
        forgetGuidanceBlob(path);
        this.setState(state => ({guidanceBlobs: {...state.guidanceBlobs, [path]: false}}));
    }

    guidanceBlockedMessage(rowState) {
        return rowState.rawMessage || this.I18n.t(rowState.messageKey);
    }

    renderGuidedCameraModal() {
        if (!this.isGuidedCamera) return null;
        const guidance = this.captureGuidance;
        const rowState = this.guidedRowState;
        return (
            <GuidedCameraModal
                visible={!!this.state.showGuidedCamera}
                labels={this.guidedCameraLabels}
                flash={guidance.flash}
                blockOnNoFlash={guidance.blockOnNoFlash}
                blockOnCaptureFailure={guidance.blockOnCaptureFailure}
                guidanceLabel={guidance.label}
                overlayPath={rowState.overlayReady ? rowState.overlayPath : null}
                onOverlayError={() => this.onGuidanceImageError(rowState.overlayPath)}
                blockedMessage={rowState.blocked ? this.guidanceBlockedMessage(rowState) : null}
                onClose={() => this.setState({showGuidedCamera: false})}
                onCapture={(photoPath) => this.onGuidedCapture(photoPath)}
            />
        );
    }

    async openGuidedCamera(onUpdateObservations) {
        if (!await DevicePermissions.request({camera: true})) return;
        this._guidedOnUpdate = onUpdateObservations;
        // Resize params only — avoids getDefaultOptions' videoQuality check throwing out of this sync handler.
        this._guidedOptions = {
            maxWidth: this.getFromKeyValue('maxWidth', DEFAULT_IMG_WIDTH),
            maxHeight: this.getFromKeyValue('maxHeight', DEFAULT_IMG_HEIGHT),
            quality: this.getFromKeyValue('imageQuality', DEFAULT_IMG_QUALITY)
        };
        this.setState({mode: Mode.Camera, showGuidedCamera: true});
    }

    // Records the observation only after resize + move succeed; on failure it rejects (modal logs + shows retake).
    async onGuidedCapture(photoPath) {
        const resizedUri = await resizeCapturedImage(ImageResizer, photoPath, this._guidedOptions);
        fs.unlink(photoPath).catch(() => {});
        if (!this.state.showGuidedCamera) return; // closed mid-resize: cancel the capture rather than commit it
        await this.addMediaFromPicker(toPickerResponse(resizedUri), this._guidedOnUpdate);
        this.setState({showGuidedCamera: false});
    }

    async launchCamera(onUpdateObservations) {
        this.setState({ mode: Mode.Camera });
        const options = { ...this.getDefaultOptions(),
            durationLimit: this.getFromKeyValue('durationLimitInSecs', DEFAULT_DURATION_LIMIT)};
        if (await DevicePermissions.request({camera: true})) {
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
        if (await DevicePermissions.request()) {
            launchImageLibrary(options,
                (response) => this.addMediaFromPicker(response, onUpdateObservations));
        }
    }

    showMedia(mediaUri, onClearAnswer) {
        return (
            <View style={[styles.contentRow, styles.imageRow]}>
                <ExpandableMedia source={mediaUri} type={this.props.element.concept.datatype}/>
                {!this.isReadOnly && <TouchableNativeFeedback onPress={() => onClearAnswer()}>
                    <Icon name={"backspace"} style={[styles.icon]}/>
                </TouchableNativeFeedback>}
            </View>
        );
    }

    showInputOptions(onUpdateObservations) {
        if (!this.isGuidedCamera) return this.renderStandardInputOptions(onUpdateObservations);
        const rowState = this.guidedRowState;
        if (rowState.blocked) return this.renderBlockedCapture(rowState);
        return (
            <View>
                {this.renderGuidance(rowState)}
                {this.renderGuidedCaptureButton(onUpdateObservations, rowState.probing)}
            </View>
        );
    }

    renderStandardInputOptions(onUpdateObservations) {
        return (
            <View style={[styles.contentRow, {justifyContent: 'flex-end'}]}>
                {!this.props.element.restrictGalleryUpload && <TouchableNativeFeedback onPress={() => {
                    this.launchMediaLibrary(onUpdateObservations)
                }}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={'folder-open'} style={styles.icon}/>
                </TouchableNativeFeedback>}
                <TouchableNativeFeedback onPress={() => this.launchCamera(onUpdateObservations)}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={this.isImage ? 'camera' : this.isVideo ? 'video' : 'alert-octagon'}
                          style={styles.icon}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    // Org-authored text, rendered verbatim — never through the platform's translations.
    renderGuidance(rowState) {
        const label = this.captureGuidance.label;
        return (
            <View>
                {label && <Text style={styles.guidanceLabel}>{label}</Text>}
                {rowState.showReckoner &&
                    <Image source={{uri: toFileUri(rowState.reckonerPath)}} style={styles.reckoner} resizeMode={'contain'}
                           onError={() => this.onGuidanceImageError(rowState.reckonerPath)}/>}
            </View>
        );
    }

    renderGuidedCaptureButton(onUpdateObservations, disabled) {
        return (
            <View style={[styles.contentRow, {justifyContent: 'flex-end'}]}>
                <TouchableNativeFeedback disabled={disabled}
                                         onPress={() => this.openGuidedCamera(onUpdateObservations)}
                                         background={TouchableNativeFeedback.SelectableBackground()}>
                    <Icon name={'camera'} style={[styles.icon, disabled && styles.iconDisabled]}/>
                </TouchableNativeFeedback>
            </View>
        );
    }

    // Visible and blocked, never hidden: a photo without its guidance is worse than no photo.
    renderBlockedCapture(rowState) {
        const label = this.captureGuidance.label;
        return (
            <View>
                {label && <Text style={styles.guidanceLabel}>{label}</Text>}
                <View style={styles.blockedBox}>
                    <Icon name={'alert-circle-outline'} style={styles.blockedIcon}/>
                    <Text style={styles.blockedText}>{this.guidanceBlockedMessage(rowState)}</Text>
                </View>
            </View>
        );
    }
}
