// @flow
import BaseProcessor from './BaseProcessor';
import PipelineStageError from '../pipeline/PipelineStageError';
import General from "../../../../utility/General";

/**
 * RuleBasedProcessor - Rule-based processor for deterministic analysis.
 * Uses heuristics and algorithms instead of ML models for simple cases.
 */
class RuleBasedProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    /**
     * Get supported model types
     */
    getSupportedModelTypes() {
        return ['classification', 'regression', 'rule_based'];
    }

    /**
     * Get supported media types
     */
    getSupportedMediaTypes() {
        return ['image/jpeg', 'image/png', 'image/webp', 'audio/wav', 'audio/mp3', 'audio/m4a'];
    }

    /**
     * Run rule-based analysis
     */
    async runInference(context, modelInput) {
        const processorConfig = context.aiConfig.pipeline.processorConfig;
        const analysisType = processorConfig.analysisType || 'basic';
        const mediaType = context.rawMedia.mimeType;
        
        try {
            General.logDebug('RuleBasedProcessor', `Running rule-based analysis: ${analysisType}`);
            
            const startTime = Date.now();
            
            let result;
            
            // Route to appropriate analysis based on media type and analysis type
            if (this.isImageType(mediaType)) {
                result = await this.runImageAnalysis(context, modelInput, analysisType);
            } else if (this.isAudioType(mediaType)) {
                result = await this.runAudioAnalysis(context, modelInput, analysisType);
            } else {
                throw new Error(`Unsupported media type: ${mediaType}`);
            }
            
            const inferenceTime = Date.now() - startTime;
            
            return {
                output: result,
                metadata: {
                    analysisType,
                    modelFile: 'rule_based',
                    modelVersion: '1.0.0',
                    inferenceMs: inferenceTime,
                    inputShape: modelInput.shape,
                    outputType: result.type,
                    algorithm: this.getAlgorithmName(analysisType),
                    confidence: this.calculateConfidence(result, result.type)
                }
            };
            
        } catch (error) {
            throw new Error(`Rule-based analysis failed: ${error.message}`);
        }
    }

    /**
     * Run image-based rule analysis
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} modelInput - Prepared input
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Analysis result
     */
    async runImageAnalysis(context, modelInput, analysisType) {
        const metadata = context.mediaMetadata;
        
        switch (analysisType) {
            case 'brightness_assessment':
                return this.assessBrightness(metadata);
                
            case 'blur_detection':
                return this.detectBlur(metadata);
                
            case 'color_analysis':
                return this.analyzeColors(metadata);
                
            case 'quality_score':
                return this.calculateQualityScore(metadata);
                
            case 'basic_classification':
                return this.basicImageClassification(metadata);
                
            default:
                throw new Error(`Unknown image analysis type: ${analysisType}`);
        }
    }

    /**
     * Run audio-based rule analysis
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} modelInput - Prepared input
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Analysis result
     */
    async runAudioAnalysis(context, modelInput, analysisType) {
        const metadata = context.mediaMetadata;
        
        switch (analysisType) {
            case 'volume_assessment':
                return this.assessVolume(metadata);
                
            case 'silence_detection':
                return this.detectSilence(metadata);
                
            case 'quality_assessment':
                return this.assessAudioQuality(metadata);
                
            case 'speech_detection':
                return this.detectSpeech(metadata);
                
            default:
                throw new Error(`Unknown audio analysis type: ${analysisType}`);
        }
    }

    /**
     * Assess image brightness
     * @param {Object} metadata - Media metadata
     * @returns {Object} Brightness assessment
     */
    assessBrightness(metadata) {
        const brightnessStats = metadata.brightnessStats || {};
        const mean = brightnessStats.mean || 0;
        const std = brightnessStats.std || 0;
        
        // Classify brightness level
        let brightnessLevel = 'normal';
        if (mean < 40) brightnessLevel = 'dark';
        else if (mean > 220) brightnessLevel = 'bright';
        else if (std < 15) brightnessLevel = 'low_contrast';
        
        // Calculate confidence based on how clearly the brightness falls into a category
        let confidence = 0.5;
        if (mean < 30 || mean > 230) confidence = 0.9;
        else if (mean < 50 || mean > 210) confidence = 0.7;
        
        return {
            type: 'classification',
            predictions: [
                { label: brightnessLevel, probability: confidence, index: 0 },
                { label: 'other', probability: 1 - confidence, index: 1 }
            ],
            predictedClass: brightnessLevel,
            confidence,
            meetsThreshold: confidence > 0.6,
            metadata: { mean, std }
        };
    }

    /**
     * Detect image blur
     * @param {Object} metadata - Media metadata
     * @returns {Object} Blur detection result
     */
    detectBlur(metadata) {
        const laplacianVariance = metadata.laplacianVariance || 0;
        
        // Classify blur level
        let blurLevel = 'sharp';
        if (laplacianVariance < 50) blurLevel = 'very_blurry';
        else if (laplacianVariance < 100) blurLevel = 'blurry';
        else if (laplacianVariance < 200) blurLevel = 'slightly_blurry';
        
        // Calculate confidence based on distance from thresholds
        let confidence = 0.5;
        if (laplacianVariance < 30 || laplacianVariance > 500) confidence = 0.9;
        else if (laplacianVariance < 80 || laplacianVariance > 300) confidence = 0.7;
        
        return {
            type: 'classification',
            predictions: [
                { label: blurLevel, probability: confidence, index: 0 },
                { label: 'sharp', probability: 1 - confidence, index: 1 }
            ],
            predictedClass: blurLevel,
            confidence,
            meetsThreshold: confidence > 0.6,
            metadata: { laplacianVariance }
        };
    }

    /**
     * Analyze image colors
     * @param {Object} metadata - Media metadata
     * @returns {Object} Color analysis result
     */
    analyzeColors(metadata) {
        const brightnessStats = metadata.brightnessStats || {};
        const mean = brightnessStats.mean || 0;
        
        // Simple color classification based on brightness
        let dominantColor = 'neutral';
        if (mean < 60) dominantColor = 'dark';
        else if (mean > 180) dominantColor = 'light';
        else if (mean >= 100 && mean <= 160) dominantColor = 'balanced';
        
        const confidence = 0.6; // Moderate confidence for simple analysis
        
        return {
            type: 'classification',
            predictions: [
                { label: dominantColor, probability: confidence, index: 0 },
                { label: 'unknown', probability: 1 - confidence, index: 1 }
            ],
            predictedClass: dominantColor,
            confidence,
            meetsThreshold: confidence > 0.5,
            metadata: { meanBrightness: mean }
        };
    }

    /**
     * Calculate overall quality score
     * @param {Object} metadata - Media metadata
     * @returns {Object} Quality score result
     */
    calculateQualityScore(metadata) {
        const laplacianVariance = metadata.laplacianVariance || 0;
        const brightnessStats = metadata.brightnessStats || {};
        const mean = brightnessStats.mean || 0;
        const std = brightnessStats.std || 0;
        
        // Calculate individual quality components
        const sharpnessScore = Math.min(100, (laplacianVariance / 200) * 100);
        const brightnessScore = this.calculateBrightnessScore(mean, std);
        const contrastScore = Math.min(100, (std / 50) * 100);
        
        // Overall quality score (weighted average)
        const overallScore = (sharpnessScore * 0.4) + (brightnessScore * 0.3) + (contrastScore * 0.3);
        
        // Classify quality level
        let qualityLevel = 'medium';
        if (overallScore >= 80) qualityLevel = 'high';
        else if (overallScore >= 60) qualityLevel = 'medium';
        else if (overallScore >= 40) qualityLevel = 'low';
        else qualityLevel = 'poor';
        
        return {
            type: 'regression',
            predictions: [
                { name: 'quality_score', value: overallScore, index: 0 },
                { name: 'sharpness_score', value: sharpnessScore, index: 1 },
                { name: 'brightness_score', value: brightnessScore, index: 2 },
                { name: 'contrast_score', value: contrastScore, index: 3 }
            ],
            primaryValue: overallScore,
            allValues: [overallScore, sharpnessScore, brightnessScore, contrastScore],
            qualityLevel,
            confidence: 0.7,
            metadata: { overallScore, sharpnessScore, brightnessScore, contrastScore }
        };
    }

    /**
     * Basic image classification
     * @param {Object} metadata - Media metadata
     * @returns {Object} Classification result
     */
    basicImageClassification(metadata) {
        const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
        const brightnessStats = metadata.brightnessStats || {};
        const mean = brightnessStats.mean || 0;
        
        // Simple heuristic classification
        let imageType = 'unknown';
        let confidence = 0.5;
        
        if (aspectRatio > 1.5) {
            imageType = 'landscape';
            confidence = 0.7;
        } else if (aspectRatio < 0.7) {
            imageType = 'portrait';
            confidence = 0.7;
        } else if (Math.abs(aspectRatio - 1.0) < 0.1) {
            imageType = 'square';
            confidence = 0.8;
        }
        
        // Adjust confidence based on brightness
        if (mean > 50 && mean < 200) {
            confidence += 0.1;
        }
        
        return {
            type: 'classification',
            predictions: [
                { label: imageType, probability: Math.min(0.9, confidence), index: 0 },
                { label: 'other', probability: Math.max(0.1, 1 - confidence), index: 1 }
            ],
            predictedClass: imageType,
            confidence: Math.min(0.9, confidence),
            meetsThreshold: confidence > 0.6,
            metadata: { aspectRatio, meanBrightness: mean }
        };
    }

    /**
     * Assess audio volume
     * @param {Object} metadata - Media metadata
     * @returns {Object} Volume assessment
     */
    assessVolume(metadata) {
        const rmsLevel = metadata.rmsLevel || 0;
        const peakLevel = metadata.peakLevel || 0;
        
        // Classify volume level
        let volumeLevel = 'normal';
        if (rmsLevel < 0.1) volumeLevel = 'very_quiet';
        else if (rmsLevel < 0.3) volumeLevel = 'quiet';
        else if (rmsLevel > 0.8) volumeLevel = 'loud';
        else if (rmsLevel > 0.6) volumeLevel = 'moderately_loud';
        
        // Calculate confidence
        let confidence = 0.6;
        if (rmsLevel < 0.05 || rmsLevel > 0.85) confidence = 0.8;
        else if (rmsLevel < 0.2 || rmsLevel > 0.7) confidence = 0.7;
        
        return {
            type: 'classification',
            predictions: [
                { label: volumeLevel, probability: confidence, index: 0 },
                { label: 'other', probability: 1 - confidence, index: 1 }
            ],
            predictedClass: volumeLevel,
            confidence,
            meetsThreshold: confidence > 0.6,
            metadata: { rmsLevel, peakLevel }
        };
    }

    /**
     * Detect silence in audio
     * @param {Object} metadata - Media metadata
     * @returns {Object} Silence detection result
     */
    detectSilence(metadata) {
        const silenceRatio = metadata.silenceRatio || 0;
        
        // Classify silence level
        let silenceLevel = 'normal';
        if (silenceRatio > 0.8) silenceLevel = 'mostly_silent';
        else if (silenceRatio > 0.6) silenceLevel = 'high_silence';
        else if (silenceRatio < 0.2) silenceLevel = 'mostly_speech';
        else if (silenceRatio < 0.1) silenceLevel = 'continuous_speech';
        
        // Calculate confidence
        const confidence = Math.abs(silenceRatio - 0.5) * 2; // Higher confidence for extreme values
        
        return {
            type: 'classification',
            predictions: [
                { label: silenceLevel, probability: confidence, index: 0 },
                { label: 'mixed', probability: 1 - confidence, index: 1 }
            ],
            predictedClass: silenceLevel,
            confidence,
            meetsThreshold: confidence > 0.6,
            metadata: { silenceRatio }
        };
    }

    /**
     * Assess overall audio quality
     * @param {Object} metadata - Media metadata
     * @returns {Object} Audio quality assessment
     */
    assessAudioQuality(metadata) {
        const rmsLevel = metadata.rmsLevel || 0;
        const peakLevel = metadata.peakLevel || 0;
        const dynamicRange = metadata.dynamicRange || 0;
        const snr = metadata.snr || 0;
        
        // Calculate individual quality components
        const volumeScore = this.calculateVolumeScore(rmsLevel);
        const dynamicRangeScore = this.calculateDynamicRangeScore(dynamicRange);
        const snrScore = this.calculateSNRScore(snr);
        
        // Overall quality score (weighted average)
        const overallScore = (volumeScore * 0.3) + (dynamicRangeScore * 0.4) + (snrScore * 0.3);
        
        // Classify quality level
        let qualityLevel = 'medium';
        if (overallScore >= 80) qualityLevel = 'high';
        else if (overallScore >= 60) qualityLevel = 'medium';
        else if (overallScore >= 40) qualityLevel = 'low';
        else qualityLevel = 'poor';
        
        return {
            type: 'regression',
            predictions: [
                { name: 'quality_score', value: overallScore, index: 0 },
                { name: 'volume_score', value: volumeScore, index: 1 },
                { name: 'dynamic_range_score', value: dynamicRangeScore, index: 2 },
                { name: 'snr_score', value: snrScore, index: 3 }
            ],
            primaryValue: overallScore,
            allValues: [overallScore, volumeScore, dynamicRangeScore, snrScore],
            qualityLevel,
            confidence: 0.7,
            metadata: { overallScore, volumeScore, dynamicRangeScore, snrScore }
        };
    }

    /**
     * Detect speech presence
     * @param {Object} metadata - Media metadata
     * @returns {Object} Speech detection result
     */
    detectSpeech(metadata) {
        const silenceRatio = metadata.silenceRatio || 0;
        const rmsLevel = metadata.rmsLevel || 0;
        const zeroCrossingRate = metadata.zeroCrossingRate || 0;
        
        // Simple speech detection heuristics
        let speechPresent = false;
        let confidence = 0.5;
        
        // Speech likely if: low silence ratio, reasonable RMS level, moderate zero crossing rate
        const speechLikelihood = (1 - silenceRatio) * 0.4 + 
                               Math.min(1, rmsLevel * 2) * 0.3 + 
                               Math.min(1, zeroCrossingRate * 10) * 0.3;
        
        speechPresent = speechLikelihood > 0.5;
        confidence = Math.abs(speechLikelihood - 0.5) * 2;
        
        return {
            type: 'classification',
            predictions: [
                { label: speechPresent ? 'speech' : 'no_speech', probability: confidence, index: 0 },
                { label: speechPresent ? 'no_speech' : 'speech', probability: 1 - confidence, index: 1 }
            ],
            predictedClass: speechPresent ? 'speech' : 'no_speech',
            confidence,
            meetsThreshold: confidence > 0.6,
            metadata: { silenceRatio, rmsLevel, zeroCrossingRate, speechLikelihood }
        };
    }

    // Helper methods

    calculateBrightnessScore(mean, std) {
        let score = 50;
        
        if (mean >= 80 && mean <= 180) {
            score += 30; // Good brightness range
        } else if (mean >= 60 && mean <= 200) {
            score += 15; // Acceptable brightness range
        }
        
        if (std >= 20 && std <= 60) {
            score += 20; // Good contrast
        } else if (std >= 15 && std <= 80) {
            score += 10; // Acceptable contrast
        }
        
        return Math.min(100, Math.max(0, score));
    }

    calculateVolumeScore(rmsLevel) {
        if (rmsLevel < 0.1) return rmsLevel * 500; // Very quiet
        if (rmsLevel < 0.3) return 50 + (rmsLevel - 0.1) * 250; // Quiet to normal
        if (rmsLevel < 0.7) return 100; // Normal to loud (optimal)
        return Math.max(20, 100 - (rmsLevel - 0.7) * 200); // Too loud
    }

    calculateDynamicRangeScore(dynamicRange) {
        if (dynamicRange < 10) return dynamicRange * 5; // Poor dynamic range
        if (dynamicRange < 30) return 50 + (dynamicRange - 10) * 2.5; // Fair to good
        if (dynamicRange < 60) return 100; // Good dynamic range
        return Math.max(70, 100 - (dynamicRange - 60)); // Too wide (noisy)
    }

    calculateSNRScore(snr) {
        if (snr < 10) return snr * 5; // Poor SNR
        if (snr < 25) return 50 + (snr - 10) * 3; // Fair SNR
        if (snr < 40) return 100; // Good SNR
        return 100; // Excellent SNR
    }

    getAlgorithmName(analysisType) {
        const algorithmMap = {
            'brightness_assessment': 'brightness_heuristic',
            'blur_detection': 'laplacian_variance',
            'color_analysis': 'brightness_based_color',
            'quality_score': 'weighted_quality_metrics',
            'basic_classification': 'aspect_ratio_classification',
            'volume_assessment': 'rms_level_analysis',
            'silence_detection': 'silence_ratio_heuristic',
            'quality_assessment': 'audio_quality_metrics',
            'speech_detection': 'speech_presence_heuristic'
        };
        
        return algorithmMap[analysisType] || 'unknown_algorithm';
    }

    isImageType(mimeType) {
        return mimeType.startsWith('image/');
    }

    isAudioType(mimeType) {
        return mimeType.startsWith('audio/');
    }

    /**
     * Get processor version
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Get processing capabilities
     */
    getCapabilities() {
        return {
            supportedAnalysisTypes: [
                'brightness_assessment', 'blur_detection', 'color_analysis', 
                'quality_score', 'basic_classification', 'volume_assessment',
                'silence_detection', 'quality_assessment', 'speech_detection'
            ],
            supportedMediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'audio/wav', 'audio/mp3'],
            requiresModels: false,
            deterministic: true,
            fastExecution: true
        };
    }
}

export default RuleBasedProcessor;
