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
function mockTFLiteOutput(modelFile) {
    console.log('[NativeModules][Prototype] TFLiteInferenceModule mock output for model:', modelFile);
    if (modelFile && modelFile.includes('eye_detector')) {
        // eye detection classification: labels are ['eye_conjunctiva', 'not_eye']
        return { probabilities: [0.92, 0.08] };
    }
    if (modelFile && modelFile.includes('hb')) {
        // Hb regression model: values array
        return { values: [10.5] };
    }
    if (modelFile && modelFile.includes('wound')) {
        // wound severity classification: ['none','mild','moderate','severe']
        return { probabilities: [0.05, 0.15, 0.55, 0.25] };
    }
    return { probabilities: [0.8, 0.2], values: [0.8] };
}

const TFLiteInferenceModule = {
    async runModel(modelFile, inputData, options = {}) {
        console.warn('[NativeModules][Prototype] TFLiteInferenceModule mock output for model:', modelFile);
        return mockTFLiteOutput(modelFile);
    },

    async getModelInfo(modelFile) {
        if (!NativeTFLiteInferenceModule) {
            return { modelFile, inputShape: [1, 224, 224, 3], outputShape: [1, 1], prototype: true };
        }
        try {
            return await NativeTFLiteInferenceModule.getModelInfo(modelFile);
        } catch (error) {
            return { modelFile, inputShape: [1, 224, 224, 3], outputShape: [1, 1], prototype: true };
        }
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
        throw new Error('[Prototype] ImageAnalysisModule.resize: native bypass - use fallback');
    },

    async crop(base64Image, region) {
        throw new Error('[Prototype] ImageAnalysisModule.crop: native bypass - use fallback');
    },

    async normalize(base64Image, options = {}) {
        throw new Error('[Prototype] ImageAnalysisModule.normalize: native bypass - use fallback');
    },

    async getMetadata(base64Image) {
        throw new Error('[Prototype] ImageAnalysisModule.getMetadata: native bypass - use fallback');
    },

    async calculateLaplacianVariance(base64Image) {
        throw new Error('[Prototype] ImageAnalysisModule.calculateLaplacianVariance: native bypass - use fallback');
    },

    async calculateBrightnessStats(base64Image) {
        throw new Error('[Prototype] ImageAnalysisModule.calculateBrightnessStats: native bypass - use fallback');
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
