import {StyleSheet, TouchableNativeFeedback, View, PermissionsAndroid, Text} from "react-native";
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
import ImageResizer from "@bam.tech/react-native-image-resizer";

const styles = StyleSheet.create({
    icon: {
        color: Colors.BrandPrimary,
        opacity: 0.8,
        fontSize: 26,
        textAlign: 'center',
        textAlignVertical: 'center',
    },
    // Icons are rendered inside this fixed square box (bigger than the glyph itself) rather than
    // sized purely by fontSize/lineHeight, so the vector-icon font's own metrics can't clip the
    // glyph against a tight row height.
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
        this.state = {showGuidedCamera: false, pendingClearAnswer: null};
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
            close: this.I18n.t('closeModal'),
            retake: this.I18n.t('Retake'),
            usePhoto: this.I18n.t('Use photo'),
            openSettings: this.I18n.t('Open settings')
        };
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
        const guided = this.isGuidedCamera;
        return (
            <View style={styles.mediaActionRow}>
                {!guided && !this.props.element.restrictGalleryUpload &&
                <TouchableNativeFeedback onPress={() => this.launchMediaLibrary(onUpdateObservations)}
                                          background={TouchableNativeFeedback.SelectableBackground()}>
                    <View style={styles.uploadButton}>
                        <Text style={styles.uploadButtonText}>{this.I18n.t('uploadImageButtonLabel')}</Text>
                        <Icon name={'folder-upload-outline'} size={20} color={Colors.BrandPrimary}/>
                    </View>
                </TouchableNativeFeedback>}
                <TouchableNativeFeedback onPress={() => {
                    guided ? this.openGuidedCamera(onUpdateObservations) : this.launchCamera(onUpdateObservations)
                }}
                                          background={TouchableNativeFeedback.SelectableBackground()}>
                    <View style={styles.addImageButton}>
                        <Text style={styles.addImageButtonText}>{this.I18n.t('addImageButtonLabel')}</Text>
                        <Icon name={this.isImage ? 'camera-plus' : this.isVideo ? 'video-plus' : 'alert-octagon'}
                              size={20} color={'#ffffff'}/>
                    </View>
                </TouchableNativeFeedback>
                {guided && <GuidedCameraModal
                    visible={!!this.state.showGuidedCamera}
                    labels={this.guidedCameraLabels}
                    onClose={() => this.setState({showGuidedCamera: false})}
                    onCapture={(photoPath) => this.onGuidedCapture(photoPath)}
                />}
            </View>
        );
    }
}
