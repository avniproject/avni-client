import {StyleSheet, TouchableNativeFeedback, View, PermissionsAndroid, Text, Image} from "react-native";
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import {launchCamera, launchImageLibrary} from "react-native-image-picker";
import fs from 'react-native-fs';
import General from "../../../utility/General";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import ExpandableMedia from "../../common/ExpandableMedia";
import FileSystem from "../../../model/FileSystem";
import DeviceInfo from 'react-native-device-info';
import RemoveMediaConfirmDialog from "../../common/RemoveMediaConfirmDialog";
import _ from "lodash";
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
import ImageResizer from "@bam.tech/react-native-image-resizer";

const styles = StyleSheet.create({
    icon: {
        color: Colors.BrandPrimary,
        opacity: 0.8,
        fontSize: 26,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    iconButtonBox: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        color: '#ff0000',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        marginTop: 16
    },
    imageRow: {
        justifyContent: 'space-between'
    },
    imagePreviewContainer: {
        marginTop: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
    },
    countBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 6,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    countBadgeText: {
        color: Colors.DefaultPrimaryColor,
        fontSize: 13,
        fontWeight: '600',
    },
    removeBadge: {
        // No circle backing in Figma - just a white glyph floating directly on the image.
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeIcon: {
        color: '#ffffff',
        fontSize: 18,
    },
    aiFlaggedBadge: {
        // No background box in Figma - white text + sparkle icon straight on the image, same
        // treatment as the remove "x" icon.
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiFlaggedText: {
        color: '#ffffff',
        fontSize: 13,
        marginRight: 4,
    },
    aiFlaggedIcon: {
        color: '#ffffff',
        fontSize: 15,
    },
    mediaActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    uploadButton: {
        flex: 1,
        minWidth: 120,
        height: 48,
        marginRight: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.BorderDefault,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadButtonText: {
        color: Colors.BrandPrimary,
        fontSize: Styles.smallTextSize,
        marginRight: 8,
    },
    addImageButton: {
        width: 160,
        height: 48,
        borderRadius: 8,
        backgroundColor: Colors.BrandPrimary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addImageButtonText: {
        color: '#ffffff',
        fontSize: Styles.smallTextSize,
        marginRight: 8,
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
        this.state = {showGuidedCamera: false, pendingClearAnswer: null, guidanceBlobs: {}};
        this.cancelRemove = this.cancelRemove.bind(this);
        this.performRemove = this.performRemove.bind(this);
    }

    confirmRemove(onClearAnswer) {
        this.setState({pendingClearAnswer: onClearAnswer});
    }

    cancelRemove() {
        this.setState({pendingClearAnswer: null});
    }

    performRemove() {
        const clearAnswer = this.state.pendingClearAnswer;
        this.setState({pendingClearAnswer: null});
        clearAnswer && clearAnswer();
    }

    renderRemoveConfirmDialog() {
        return (
            <RemoveMediaConfirmDialog
                visible={!_.isNil(this.state.pendingClearAnswer)}
                onCancel={this.cancelRemove}
                onConfirm={this.performRemove}
            />
        );
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
            permissionRequired: this.I18n.t('guidedCameraPermissionRequired'),
            flashRequired: this.I18n.t('guidedCameraFlashRequired'),
            captureFailed: this.I18n.t('guidedCameraCaptureFailed'),
            continueWithoutPhoto: this.I18n.t('guidedCameraContinueWithoutPhoto'),
            close: this.I18n.t('closeModal'),
            retake: this.I18n.t('Retake'),
            usePhoto: this.I18n.t('Use photo'),
            openSettings: this.I18n.t('Open settings')
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

    openGuidedCamera(onUpdateObservations) {
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

    showMedia(mediaUri, onClearAnswer, index, isFlagged) {
        if (this.isImage) {
            return (
                <View style={styles.imagePreviewContainer}>
                    <ExpandableMedia source={mediaUri} type={this.props.element.concept.datatype} fullWidth={true}/>
                    {isFlagged ?
                        <View style={styles.aiFlaggedBadge}>
                            <Text style={styles.aiFlaggedText}>{this.I18n.t('aiFlaggedLabel')}</Text>
                            <Icon name={"creation"} style={styles.aiFlaggedIcon}/>
                        </View>
                        : !_.isNil(index) &&
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{index + 1}</Text>
                        </View>}
                    {!this.isReadOnly &&
                        <TouchableNativeFeedback onPress={() => this.confirmRemove(onClearAnswer)}
                                                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}>
                            <View style={styles.removeBadge}>
                                <Icon name={"close"} style={styles.removeIcon}/>
                            </View>
                        </TouchableNativeFeedback>}
                </View>
            );
        }
        return (
            <View style={[styles.contentRow, styles.imageRow]}>
                <ExpandableMedia source={mediaUri} type={this.props.element.concept.datatype}/>
                {!this.isReadOnly && <TouchableNativeFeedback onPress={() => this.confirmRemove(onClearAnswer)}
                                                               background={TouchableNativeFeedback.SelectableBackgroundBorderless()}>
                    <View style={styles.iconButtonBox}>
                        <Icon name={"backspace-outline"} style={styles.icon}/>
                    </View>
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
            <View style={styles.mediaActionRow}>
                {!this.props.element.restrictGalleryUpload &&
                <TouchableNativeFeedback onPress={() => this.launchMediaLibrary(onUpdateObservations)}
                                          background={TouchableNativeFeedback.SelectableBackground()}>
                    <View style={styles.uploadButton}>
                        <Text style={styles.uploadButtonText}>{this.I18n.t('uploadImageButtonLabel')}</Text>
                        <Icon name={'folder-upload-outline'} size={20} color={Colors.BrandPrimary}/>
                    </View>
                </TouchableNativeFeedback>}
                <TouchableNativeFeedback onPress={() => this.launchCamera(onUpdateObservations)}
                                          background={TouchableNativeFeedback.SelectableBackground()}>
                    <View style={styles.addImageButton}>
                        <Text style={styles.addImageButtonText}>{this.I18n.t('addImageButtonLabel')}</Text>
                        <Icon name={this.isImage ? 'camera-plus' : this.isVideo ? 'video-plus' : 'alert-octagon'}
                              size={20} color={'#ffffff'}/>
                    </View>
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
            <View style={styles.mediaActionRow}>
                <TouchableNativeFeedback disabled={disabled}
                                          onPress={() => this.openGuidedCamera(onUpdateObservations)}
                                          background={TouchableNativeFeedback.SelectableBackground()}>
                    <View style={[styles.addImageButton, disabled && {backgroundColor: Colors.DisabledButtonColor}]}>
                        <Text style={styles.addImageButtonText}>{this.I18n.t('addImageButtonLabel')}</Text>
                        <Icon name={'camera-plus'} size={20} color={'#ffffff'}/>
                    </View>
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
