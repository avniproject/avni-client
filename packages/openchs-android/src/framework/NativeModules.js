// @flow
import {NativeModules} from 'react-native';

/**
 * AI Native Modules - Bridge to native Android modules for AI inference and media analysis.
 * These modules provide on-device ML capabilities for the AI observation pipeline.
 */

const {
    TFLiteInferenceModule: NativeTFLiteInferenceModule,
    ONNXInferenceModule: NativeONNXInferenceModule,
    ImageAnalysisModule: NativeImageAnalysisModule,
    AudioAnalysisModule: NativeAudioAnalysisModule,
} = NativeModules;

/**
 * TFLiteInferenceModule - Runs TensorFlow Lite models on-device.
 * Supports classification, regression, and segmentation model types.
 */
const TFLiteInferenceModule = {
    async runModel(modelFile, inputData, options = {}) {
        if (!NativeTFLiteInferenceModule) {
            throw new Error('TFLiteInferenceModule is not available. Ensure the native module is properly linked.');
        }
        return NativeTFLiteInferenceModule.runModel(modelFile, inputData, options);
    },

    async getModelInfo(modelFile) {
        if (!NativeTFLiteInferenceModule) {
            throw new Error('TFLiteInferenceModule is not available.');
        }
        return NativeTFLiteInferenceModule.getModelInfo(modelFile);
    },

    async isModelAvailable(modelFile) {
        if (!NativeTFLiteInferenceModule) {
            return false;
        }
        try {
            return await NativeTFLiteInferenceModule.isModelAvailable(modelFile);
        } catch (error) {
            return false;
        }
    },
};

/**
 * ONNXInferenceModule - Runs ONNX Runtime models on-device.
 * Supports classification, regression, and segmentation model types.
 */
const ONNXInferenceModule = {
    async runModel(modelFile, inputData, options = {}) {
        if (!NativeONNXInferenceModule) {
            throw new Error('ONNXInferenceModule is not available. Ensure the native module is properly linked.');
        }
        return NativeONNXInferenceModule.runModel(modelFile, inputData, options);
    },

    async getModelInfo(modelFile) {
        if (!NativeONNXInferenceModule) {
            throw new Error('ONNXInferenceModule is not available.');
        }
        return NativeONNXInferenceModule.getModelInfo(modelFile);
    },

    async isModelAvailable(modelFile) {
        if (!NativeONNXInferenceModule) {
            return false;
        }
        try {
            return await NativeONNXInferenceModule.isModelAvailable(modelFile);
        } catch (error) {
            return false;
        }
    },
};

/**
 * ImageAnalysisModule - Native image processing for quality analysis and preprocessing.
 * Provides resize, crop, normalize, and metadata extraction capabilities.
 */
const ImageAnalysisModule = {
    async resize(base64Image, options = {}) {
        if (!NativeImageAnalysisModule) {
            throw new Error('ImageAnalysisModule is not available.');
        }
        return NativeImageAnalysisModule.resize(base64Image, options);
    },

    async crop(base64Image, region) {
        if (!NativeImageAnalysisModule) {
            throw new Error('ImageAnalysisModule is not available.');
        }
        return NativeImageAnalysisModule.crop(base64Image, region);
    },

    async normalize(base64Image, options = {}) {
        if (!NativeImageAnalysisModule) {
            throw new Error('ImageAnalysisModule is not available.');
        }
        return NativeImageAnalysisModule.normalize(base64Image, options);
    },

    async getMetadata(base64Image) {
        if (!NativeImageAnalysisModule) {
            throw new Error('ImageAnalysisModule is not available.');
        }
        return NativeImageAnalysisModule.getMetadata(base64Image);
    },

    async calculateLaplacianVariance(base64Image) {
        if (!NativeImageAnalysisModule) {
            throw new Error('ImageAnalysisModule is not available.');
        }
        return NativeImageAnalysisModule.calculateLaplacianVariance(base64Image);
    },

    async calculateBrightnessStats(base64Image) {
        if (!NativeImageAnalysisModule) {
            throw new Error('ImageAnalysisModule is not available.');
        }
        return NativeImageAnalysisModule.calculateBrightnessStats(base64Image);
    },
};

/**
 * AudioAnalysisModule - Native audio processing for quality analysis and preprocessing.
 * Provides normalization, metadata extraction, silence detection, and speech analysis.
 */
const AudioAnalysisModule = {
    async normalize(audioUri, options = {}) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.normalize(audioUri, options);
    },

    async getMetadata(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.getMetadata(audioUri);
    },

    async extractSegment(audioUri, startTime, duration) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.extractSegment(audioUri, startTime, duration);
    },

    async processForSpeech(audioUri, options = {}) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.processForSpeech(audioUri, options);
    },

    async reduceNoise(audioUri, options = {}) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.reduceNoise(audioUri, options);
    },

    async normalizeLevels(audioUri, options = {}) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.normalizeLevels(audioUri, options);
    },

    async detectSpeechSegments(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.detectSpeechSegments(audioUri);
    },

    async calculateSpeechLevel(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.calculateSpeechLevel(audioUri);
    },

    async estimateNoiseLevel(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.estimateNoiseLevel(audioUri);
    },

    async calculateRMSLevel(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.calculateRMSLevel(audioUri);
    },

    async detectVoiceActivity(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.detectVoiceActivity(audioUri);
    },

    async estimateSpeechRate(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.estimateSpeechRate(audioUri);
    },

    async analyzePitch(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.analyzePitch(audioUri);
    },

    async extractFormants(audioUri) {
        if (!NativeAudioAnalysisModule) {
            throw new Error('AudioAnalysisModule is not available.');
        }
        return NativeAudioAnalysisModule.extractFormants(audioUri);
    },
};

module.exports = {
    TFLiteInferenceModule,
    ONNXInferenceModule,
    ImageAnalysisModule,
    AudioAnalysisModule,
};
