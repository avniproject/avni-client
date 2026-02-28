// @flow
import PropTypes from 'prop-types';
import React from "react";
import AbstractFormElement from "./AbstractFormElement";
import {ActivityIndicator, PermissionsAndroid, StyleSheet, TouchableNativeFeedback, TouchableOpacity, View} from "react-native";
import {Text} from "native-base";
import ValidationErrorMessage from "../ValidationErrorMessage";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import General from "../../../utility/General";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import ExpandableMedia from "../../common/ExpandableMedia";
import FileSystem from "../../../model/FileSystem";
import fs from "react-native-fs";
import {launchCamera, launchImageLibrary} from "react-native-image-picker";
import DeviceInfo from "react-native-device-info";
import AIPipeline from "../../../service/ai/pipeline/AIPipeline";
import ConjunctivaGuide from "./ai/ConjunctivaGuide";
import WoundGuide from "./ai/WoundGuide";
import CaptureGuideOverlay from "./ai/CaptureGuideOverlay";
import _ from "lodash";

const PipelineState = {
    IDLE: 'IDLE',
    CAPTURING: 'CAPTURING',
    PROCESSING: 'PROCESSING',
    RESULTS_READY: 'RESULTS_READY',
    ERROR: 'ERROR'
};

class AIObservationFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        parentFormElement: PropTypes.object,
        questionGroupIndex: PropTypes.number,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            pipelineState: PipelineState.IDLE,
            capturedMediaUri: null,
            capturedMediaFileName: null,
            pipelineResult: null,
            processingMessage: '',
            errorMessage: '',
        };
        this.pipeline = new AIPipeline();
    }

    getAIConfig() {
        return this.props.element.concept.additionalInfo?.aiConfig || null;
    }

    isImageCapture() {
        const aiConfig = this.getAIConfig();
        const mediaType = aiConfig?.mediaType || 'image';
        return mediaType === 'image';
    }

    isAudioCapture() {
        const aiConfig = this.getAIConfig();
        const mediaType = aiConfig?.mediaType || 'image';
        return mediaType === 'audio';
    }

    getMimeType() {
        if (this.isImageCapture()) return 'image/jpeg';
        if (this.isAudioCapture()) return 'audio/wav';
        return 'image/jpeg';
    }

    async isPermissionGranted() {
        const apiLevel = await DeviceInfo.getApiLevel();
        General.logDebug('AIObservationFormElement', `API level: ${apiLevel}, storage deprecated level: ${General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL}`);
        const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA];

        if (apiLevel < General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL) {
            permissions.push(
                PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
        }

        if (this.isAudioCapture()) {
            permissions.push(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        }

        General.logDebug('AIObservationFormElement', `Requesting permissions: ${JSON.stringify(permissions)}`);
        const permissionRequest = await PermissionsAndroid.requestMultiple(permissions);
        General.logDebug('AIObservationFormElement', `Permission results: ${JSON.stringify(permissionRequest)}`);
        const granted = _.every(permissionRequest, p => p === PermissionsAndroid.RESULTS.GRANTED);
        General.logDebug('AIObservationFormElement', `All permissions granted: ${granted}`);
        return granted;
    }

    async pickFromGallery() {
        General.logDebug('AIObservationFormElement', 'pickFromGallery: checking permissions');
        if (!(await this.isPermissionGranted())) {
            General.logError('AIObservationFormElement', 'pickFromGallery: permissions denied, aborting');
            return;
        }

        this.setState({pipelineState: PipelineState.CAPTURING});

        const options = {
            mediaType: 'photo',
            maxWidth: 1280,
            maxHeight: 960,
            quality: 1,
            includeBase64: true,
            selectionLimit: 1,
        };

        General.logDebug('AIObservationFormElement', `launchImageLibrary options: ${JSON.stringify(options)}`);

        launchImageLibrary(options, (response) => {
            General.logDebug('AIObservationFormElement', `launchImageLibrary response: didCancel=${response.didCancel}, errorCode=${response.errorCode}, errorMessage=${response.errorMessage}, assetCount=${response.assets?.length}`);

            if (response.didCancel) {
                General.logDebug('AIObservationFormElement', 'launchImageLibrary: user cancelled');
                this.setState({pipelineState: PipelineState.IDLE});
                return;
            }

            if (response.errorCode) {
                General.logError('AIObservationFormElement', `launchImageLibrary error: [${response.errorCode}] ${response.errorMessage}`);
                this.setState({pipelineState: PipelineState.IDLE});
                return;
            }

            const asset = _.get(response, 'assets[0]');
            if (!asset) {
                General.logError('AIObservationFormElement', 'launchImageLibrary: no asset in response');
                this.setState({pipelineState: PipelineState.IDLE});
                return;
            }

            General.logDebug('AIObservationFormElement', `asset: uri=${asset.uri}, width=${asset.width}, height=${asset.height}, fileSize=${asset.fileSize}, hasBase64=${!!asset.base64}`);

            const ext = asset.uri.split('.').pop();
            const fileName = `${General.randomUUID()}.${ext}`;
            const directory = FileSystem.getImagesDir();
            const destPath = `${directory}/${fileName}`;

            General.logDebug('AIObservationFormElement', `copyFile: src=${asset.uri} -> dest=${destPath}`);

            fs.copyFile(asset.uri, destPath)
                .then(() => {
                    General.logDebug('AIObservationFormElement', `copyFile success: ${destPath}`);
                    this.setState({
                        capturedMediaUri: destPath,
                        capturedMediaFileName: fileName,
                    });
                    this.runPipeline(asset.base64, fileName);
                })
                .catch((error) => {
                    General.logError('AIObservationFormElement', `copyFile failed: src=${asset.uri}, dest=${destPath}, error=${error.message}`);
                    this.setState({
                        pipelineState: PipelineState.ERROR,
                        errorMessage: `Failed to save image: ${error.message}`,
                    });
                });
        });
    }

    async captureImage() {
        General.logDebug('AIObservationFormElement', 'captureImage: checking permissions');
        if (!(await this.isPermissionGranted())) {
            General.logError('AIObservationFormElement', 'captureImage: permissions denied, aborting');
            return;
        }

        this.setState({pipelineState: PipelineState.CAPTURING});

        const aiConfig = this.getAIConfig();
        const captureConfig = aiConfig?.captureConfig || {};

        const options = {
            mediaType: 'photo',
            maxWidth: captureConfig.maxWidth || 1280,
            maxHeight: captureConfig.maxHeight || 960,
            quality: captureConfig.quality || 1,
            includeBase64: true,
            saveToPhotos: false,
        };

        General.logDebug('AIObservationFormElement', `launchCamera options: ${JSON.stringify(options)}`);

        launchCamera(options, (response) => {
            General.logDebug('AIObservationFormElement', `launchCamera response: didCancel=${response.didCancel}, errorCode=${response.errorCode}, errorMessage=${response.errorMessage}, assetCount=${response.assets?.length}`);

            if (response.didCancel) {
                General.logDebug('AIObservationFormElement', 'launchCamera: user cancelled');
                this.setState({pipelineState: PipelineState.IDLE});
                return;
            }

            if (response.errorCode) {
                General.logError('AIObservationFormElement', `launchCamera error: [${response.errorCode}] ${response.errorMessage}`);
                this.setState({pipelineState: PipelineState.IDLE});
                return;
            }

            const asset = _.get(response, 'assets[0]');
            if (!asset) {
                General.logError('AIObservationFormElement', 'launchCamera: no asset in response');
                this.setState({pipelineState: PipelineState.IDLE});
                return;
            }

            General.logDebug('AIObservationFormElement', `asset: uri=${asset.uri}, width=${asset.width}, height=${asset.height}, fileSize=${asset.fileSize}, hasBase64=${!!asset.base64}`);

            const ext = asset.uri.split('.').pop();
            const fileName = `${General.randomUUID()}.${ext}`;
            const directory = FileSystem.getImagesDir();
            const destPath = `${directory}/${fileName}`;

            General.logDebug('AIObservationFormElement', `moveFile: src=${asset.uri} -> dest=${destPath}`);

            fs.moveFile(asset.uri, destPath)
                .then(() => {
                    General.logDebug('AIObservationFormElement', `moveFile success: ${destPath}`);
                    this.setState({
                        capturedMediaUri: destPath,
                        capturedMediaFileName: fileName,
                    });
                    this.runPipeline(asset.base64, fileName);
                })
                .catch((error) => {
                    General.logError('AIObservationFormElement', `moveFile failed: src=${asset.uri}, dest=${destPath}, error=${error.message}`);
                    this.setState({
                        pipelineState: PipelineState.ERROR,
                        errorMessage: `Failed to save captured image: ${error.message}`,
                    });
                });
        });
    }

    async runPipeline(base64Data, fileName) {
        General.logDebug('AIObservationFormElement', `runPipeline: fileName=${fileName}, hasBase64=${!!base64Data}, base64Length=${base64Data?.length}`);
        this.setState({
            pipelineState: PipelineState.PROCESSING,
            processingMessage: 'Analyzing...',
        });

        try {
            const concept = this.props.element.concept;
            const rawMedia = {
                uri: this.state.capturedMediaUri || fileName,
                base64: base64Data,
                mimeType: this.getMimeType(),
                fileName: fileName,
            };

            General.logDebug('AIObservationFormElement', `runPipeline: concept.name=${concept.name}, mediaType=${this.getMimeType()}, uri=${rawMedia.uri}`);
            General.logDebug('AIObservationFormElement', `runPipeline: aiConfig=${JSON.stringify(concept.additionalInfo?.aiConfig)}`);

            const result = await this.pipeline.runPipeline(concept, rawMedia);

            General.logDebug('AIObservationFormElement', `runPipeline: result.status=${result.status}, isSuccess=${result.isSuccess()}, errorCode=${result.errorCode}`);

            if (result.isSuccess()) {
                General.logDebug('AIObservationFormElement', `runPipeline success: estimatedValues=${JSON.stringify(result.estimatedValues)}, confidence=${result.confidence}`);
                this.setState({
                    pipelineState: PipelineState.RESULTS_READY,
                    pipelineResult: result,
                    processingMessage: '',
                });
            } else {
                const userMessage = result.userMessage || 'Analysis failed. Please try again.';
                General.logError('AIObservationFormElement', `runPipeline non-success: errorCode=${result.errorCode}, userMessage=${userMessage}`);
                this.setState({
                    pipelineState: PipelineState.ERROR,
                    errorMessage: userMessage,
                    pipelineResult: result,
                });
            }
        } catch (error) {
            General.logError('AIObservationFormElement', `runPipeline exception: ${error.message}\n${error.stack}`);
            this.setState({
                pipelineState: PipelineState.ERROR,
                errorMessage: error.userMessage || `Analysis failed: ${error.message}`,
            });
        }
    }

    acceptResults() {
        const {pipelineResult} = this.state;
        if (!pipelineResult || !pipelineResult.observations) return;

        // Dispatch each observation to the form
        for (const observation of pipelineResult.observations) {
            this.dispatchAction(this.props.actionName, {
                formElement: this.props.element,
                parentFormElement: this.props.parentFormElement,
                questionGroupIndex: this.props.questionGroupIndex,
                value: observation.getValue(),
                observation: observation,
            });
        }

        this.setState({pipelineState: PipelineState.IDLE});
    }

    retake() {
        this.setState({
            pipelineState: PipelineState.IDLE,
            capturedMediaUri: null,
            capturedMediaFileName: null,
            pipelineResult: null,
            errorMessage: '',
            processingMessage: '',
        });
    }

    getGuideType() {
        const aiConfig = this.getAIConfig();
        const preProcessor = aiConfig?.pipeline?.preProcessor;
        if (preProcessor === 'ConjunctivaPreProcessor') return 'conjunctiva';
        if (preProcessor === 'WoundPreProcessor') return 'wound';
        return 'generic';
    }

    renderCaptureGuide() {
        const guideType = this.getGuideType();
        const aiConfig = this.getAIConfig();
        const guideInstructions = aiConfig?.captureConfig?.instructions || [];

        switch (guideType) {
            case 'conjunctiva':
                return <ConjunctivaGuide isActive={true} instructions={guideInstructions}/>;
            case 'wound':
                return <WoundGuide isActive={true} instructions={guideInstructions}/>;
            default:
                return <CaptureGuideOverlay guideType="generic" isActive={true} instructions={guideInstructions}/>;
        }
    }

    renderCaptureButton() {
        const iconName = this.isImageCapture() ? 'camera' : 'microphone';
        const label = this.isImageCapture() ? 'captureImage' : 'recordAudio';
        const aiConfig = this.getAIConfig();
        const showGuide = aiConfig?.captureConfig?.showGuide !== false;

        return (
            <View>
                {showGuide && this.renderCaptureGuide()}
                <View style={styles.captureRow}>
                    <TouchableOpacity
                        style={[styles.captureButton, {flex: 1, marginRight: this.isImageCapture() ? 8 : 0}]}
                        onPress={() => this.captureImage()}>
                        <Icon name={iconName} style={styles.captureIcon}/>
                        <Text style={styles.captureButtonText}>{this.I18n.t(label)}</Text>
                    </TouchableOpacity>
                    {this.isImageCapture() && (
                        <TouchableOpacity
                            style={[styles.captureButton, {flex: 1, backgroundColor: '#607D8B'}]}
                            onPress={() => this.pickFromGallery()}>
                            <Icon name="folder-open" style={styles.captureIcon}/>
                            <Text style={styles.captureButtonText}>Gallery</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    renderProcessing() {
        return (
            <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.ActionButtonColor}/>
                <Text style={styles.processingText}>{this.state.processingMessage}</Text>
            </View>
        );
    }

    renderError() {
        const {pipelineResult} = this.state;
        const recommendations = pipelineResult?.recommendations || [];
        return (
            <View style={styles.errorContainer}>
                <View style={styles.errorHeader}>
                    <Icon name="alert-circle" style={styles.errorIcon}/>
                    <Text style={styles.errorText}>{this.state.errorMessage}</Text>
                </View>
                {recommendations.length > 0 && (
                    <View style={styles.recommendationsContainer}>
                        {recommendations.map((rec, index) => (
                            <Text key={index} style={styles.recommendationText}>
                                {`\u2022 ${rec}`}
                            </Text>
                        ))}
                    </View>
                )}
                <TouchableOpacity style={styles.retakeButton} onPress={() => this.retake()}>
                    <Icon name="camera-retake" style={styles.retakeIcon}/>
                    <Text style={styles.retakeButtonText}>{this.I18n.t('retake')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    renderResults() {
        const {pipelineResult, capturedMediaUri} = this.state;
        const estimatedValues = pipelineResult?.estimatedValues || {};
        const confidence = pipelineResult?.confidence || 0;
        const qualityTier = pipelineResult?.qualityTier || 'UNKNOWN';
        const qualityScore = pipelineResult?.qualityScore || 0;
        const warnings = pipelineResult?.warnings || [];

        return (
            <View style={styles.resultsContainer}>
                {capturedMediaUri && (
                    <View style={styles.mediaPreview}>
                        <ExpandableMedia source={capturedMediaUri.replace(/^.*[\\\/]/, '')} type="Image"/>
                    </View>
                )}

                <View style={styles.qualityBadge}>
                    <View style={[styles.qualityIndicator, {backgroundColor: this.getQualityColor(qualityTier)}]}/>
                    <Text style={styles.qualityText}>
                        {`${this.I18n.t('quality')}: ${qualityTier} (${Math.round(qualityScore)}%)`}
                    </Text>
                </View>

                <View style={styles.estimatedValuesContainer}>
                    <Text style={styles.sectionTitle}>{this.I18n.t('estimatedValues')}</Text>
                    {this.renderEstimatedValues(estimatedValues)}
                </View>

                <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>{this.I18n.t('confidence')}</Text>
                    <View style={styles.confidenceBarBackground}>
                        <View style={[styles.confidenceBarFill, {
                            width: `${Math.round(confidence * 100)}%`,
                            backgroundColor: this.getConfidenceColor(confidence)
                        }]}/>
                    </View>
                    <Text style={styles.confidenceValue}>{`${Math.round(confidence * 100)}%`}</Text>
                </View>

                {warnings.length > 0 && (
                    <View style={styles.warningsContainer}>
                        {warnings.map((warning, index) => (
                            <View key={index} style={styles.warningRow}>
                                <Icon name="alert" style={styles.warningIcon}/>
                                <Text style={styles.warningText}>{warning}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.acceptButton} onPress={() => this.acceptResults()}>
                        <Icon name="check-circle" style={styles.acceptIcon}/>
                        <Text style={styles.acceptButtonText}>{this.I18n.t('accept')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.retakeButton} onPress={() => this.retake()}>
                        <Icon name="camera-retake" style={styles.retakeIcon}/>
                        <Text style={styles.retakeButtonText}>{this.I18n.t('retake')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    renderEstimatedValues(estimatedValues) {
        if (_.isNil(estimatedValues) || _.isEmpty(estimatedValues)) {
            return <Text style={styles.noDataText}>{this.I18n.t('noEstimatedValues')}</Text>;
        }

        return Object.entries(estimatedValues).map(([key, value]) => (
            <View key={key} style={styles.estimatedValueRow}>
                <Text style={styles.estimatedValueLabel}>{this.I18n.t(key)}</Text>
                <Text style={styles.estimatedValueText}>
                    {_.isNumber(value) ? value.toFixed(2) : String(value)}
                </Text>
            </View>
        ));
    }

    getQualityColor(tier) {
        switch (tier) {
            case 'HIGH': return '#4CAF50';
            case 'MEDIUM': return '#FF9800';
            case 'LOW': return '#F44336';
            case 'UNUSABLE': return '#9E9E9E';
            default: return '#9E9E9E';
        }
    }

    getConfidenceColor(confidence) {
        if (confidence >= 0.8) return '#4CAF50';
        if (confidence >= 0.6) return '#FF9800';
        return '#F44336';
    }

    renderContent() {
        switch (this.state.pipelineState) {
            case PipelineState.IDLE:
                return this.renderCaptureButton();
            case PipelineState.CAPTURING:
                return this.renderProcessing();
            case PipelineState.PROCESSING:
                return this.renderProcessing();
            case PipelineState.RESULTS_READY:
                return this.renderResults();
            case PipelineState.ERROR:
                return this.renderError();
            default:
                return this.renderCaptureButton();
        }
    }

    render() {
        const aiConfig = this.getAIConfig();
        if (!aiConfig) {
            return null;
        }

        return (
            <View style={styles.container}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {this.renderContent()}
                <View style={styles.lineStyle}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    captureRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    captureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.ActionButtonColor,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    captureIcon: {
        color: '#FFFFFF',
        fontSize: 24,
        marginRight: 8,
    },
    captureButtonText: {
        color: '#FFFFFF',
        fontSize: Styles.normalTextSize,
        fontWeight: '500',
    },
    processingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    processingText: {
        marginTop: 12,
        color: Colors.InputNormal,
        fontSize: Styles.smallTextSize,
    },
    errorContainer: {
        backgroundColor: '#FFF3F0',
        borderRadius: 4,
        padding: 12,
        marginTop: 8,
    },
    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorIcon: {
        color: Colors.ValidationError,
        fontSize: 20,
        marginRight: 8,
    },
    errorText: {
        color: Colors.ValidationError,
        fontSize: Styles.smallTextSize,
        flex: 1,
    },
    recommendationsContainer: {
        marginTop: 8,
        paddingLeft: 28,
    },
    recommendationText: {
        color: Colors.InputNormal,
        fontSize: Styles.smallerTextSize,
        marginBottom: 4,
    },
    resultsContainer: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: Colors.InputBorderNormal,
        borderRadius: 4,
        padding: 12,
    },
    mediaPreview: {
        marginBottom: 12,
        alignItems: 'center',
    },
    qualityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    qualityIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    qualityText: {
        color: Colors.InputNormal,
        fontSize: Styles.smallTextSize,
    },
    estimatedValuesContainer: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: Styles.smallTextSize,
        fontWeight: '600',
        color: Colors.InputNormal,
        marginBottom: 6,
    },
    estimatedValueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: Colors.GreyContentBackground,
        borderRadius: 2,
        marginBottom: 2,
    },
    estimatedValueLabel: {
        color: Colors.InputNormal,
        fontSize: Styles.smallTextSize,
    },
    estimatedValueText: {
        color: Colors.InputNormal,
        fontSize: Styles.smallTextSize,
        fontWeight: '600',
    },
    noDataText: {
        color: Colors.DisabledButtonColor,
        fontSize: Styles.smallTextSize,
        fontStyle: 'italic',
    },
    confidenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    confidenceLabel: {
        color: Colors.InputNormal,
        fontSize: Styles.smallerTextSize,
        marginRight: 8,
        width: 80,
    },
    confidenceBarBackground: {
        flex: 1,
        height: 8,
        backgroundColor: Colors.GreyBackground,
        borderRadius: 4,
        overflow: 'hidden',
    },
    confidenceBarFill: {
        height: 8,
        borderRadius: 4,
    },
    confidenceValue: {
        color: Colors.InputNormal,
        fontSize: Styles.smallerTextSize,
        marginLeft: 8,
        width: 40,
        textAlign: 'right',
    },
    warningsContainer: {
        backgroundColor: '#FFF8E1',
        borderRadius: 4,
        padding: 8,
        marginBottom: 12,
    },
    warningRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    warningIcon: {
        color: '#FF9800',
        fontSize: 16,
        marginRight: 6,
    },
    warningText: {
        color: Colors.InputNormal,
        fontSize: Styles.smallerTextSize,
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    acceptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.ActionButtonColor,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
        flex: 1,
        marginRight: 8,
    },
    acceptIcon: {
        color: '#FFFFFF',
        fontSize: 20,
        marginRight: 6,
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: Styles.smallTextSize,
        fontWeight: '500',
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.SecondaryActionButtonColor,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
        marginTop: 8,
    },
    retakeIcon: {
        color: Colors.InputNormal,
        fontSize: 20,
        marginRight: 6,
    },
    retakeButtonText: {
        color: Colors.InputNormal,
        fontSize: Styles.smallTextSize,
    },
    lineStyle: {
        flex: 1,
        borderColor: Colors.BlackBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        opacity: 0.1,
        marginTop: 8,
    },
});

export default AIObservationFormElement;
