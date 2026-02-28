// @flow
import AudioPreProcessor from './AudioPreProcessor';
import General from "../../../../utility/General";

/**
 * SpeechPreProcessor - Specialized preprocessor for speech audio.
 * Optimizes audio for speech recognition and transcription.
 */
class SpeechPreProcessor extends AudioPreProcessor {
    constructor() {
        super();
    }

    /**
     * Get quality gate names for speech processing
     */
    getQualityGateNames() {
        return ['SilenceGate', 'ClippingGate'];
    }

    /**
     * Custom processing for speech audio
     */
    async customProcessing(context) {
        await this.optimizeForSpeech(context);
        await this.removeBackgroundNoise(context);
        await this.normalizeSpeechLevels(context);
    }

    /**
     * Optimize audio for speech recognition
     * @param {PipelineContext} context 
     */
    async optimizeForSpeech(context) {
        try {
            const { processedMedia } = context;
            
            General.logDebug('SpeechPreProcessor', 'Optimizing audio for speech recognition...');
            
            // Apply speech-specific optimizations
            const optimizedAudio = await this.applySpeechOptimizations(processedMedia);
            
            context.processedMedia = optimizedAudio;
            
            // Store speech optimization metadata
            context.mediaMetadata.speechOptimization = {
                voiceActivityDetected: true,
                speechSegments: await this.detectSpeechSegments(optimizedAudio),
                averageSpeechLevel: await this.calculateAverageSpeechLevel(optimizedAudio)
            };

            General.logDebug('SpeechPreProcessor', 'Speech optimization completed');
            
        } catch (error) {
            // Speech optimization is not critical - continue with original
            General.logWarn('SpeechPreProcessor', `Speech optimization failed: ${error.message}`);
        }
    }

    /**
     * Remove background noise from speech audio
     * @param {PipelineContext} context 
     */
    async removeBackgroundNoise(context) {
        try {
            const { processedMedia } = context;
            
            General.logDebug('SpeechPreProcessor', 'Removing background noise...');
            
            // Apply noise reduction
            const denoisedAudio = await this.applyNoiseReduction(processedMedia);
            
            context.processedMedia = denoisedAudio;
            
            // Store noise reduction metadata
            context.mediaMetadata.noiseReduction = {
                noiseLevelBefore: context.mediaMetadata.rmsLevel || 0,
                noiseLevelAfter: await this.calculateNoiseLevel(denoisedAudio),
                reductionApplied: true
            };

            General.logDebug('SpeechPreProcessor', 'Background noise removal completed');
            
        } catch (error) {
            // Noise reduction is not critical - continue with original
            General.logWarn('SpeechPreProcessor', 'Noise reduction failed: ${error.message}');
        }
    }

    /**
     * Normalize speech levels for consistent volume
     * @param {PipelineContext} context 
     */
    async normalizeSpeechLevels(context) {
        try {
            const { processedMedia } = context;
            
            General.logDebug('SpeechPreProcessor', 'Normalizing speech levels...');
            
            // Apply level normalization
            const normalizedAudio = await this.applyLevelNormalization(processedMedia);
            
            context.processedMedia = normalizedAudio;
            
            // Store normalization metadata
            context.mediaMetadata.levelNormalization = {
                originalRMS: context.mediaMetadata.rmsLevel || 0,
                normalizedRMS: await this.calculateRMSLevel(normalizedAudio),
                targetLevel: -16, // Standard speech level in dB
                normalizationApplied: true
            };

            General.logDebug('SpeechPreProcessor', 'Speech level normalization completed');
            
        } catch (error) {
            // Level normalization is not critical - continue with original
            General.logWarn('SpeechPreProcessor', `Level normalization failed: ${error.message}`);
        }
    }

    /**
     * Apply speech-specific audio optimizations
     */
    async applySpeechOptimizations(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const optimizedAudio = await AudioAnalysisModule.processForSpeech(audioMedia.uri, {
                bandpassFilter: {
                    lowFreq: 80,    // Remove low-frequency rumble
                    highFreq: 8000   // Remove high-frequency hiss
                },
                preEmphasis: true,
                voiceActivityDetection: true
            });

            return {
                ...audioMedia,
                uri: optimizedAudio.uri,
                optimized: true
            };
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Speech optimization failed: ${error.message}`);
            return audioMedia;
        }
    }

    /**
     * Apply noise reduction algorithms
     */
    async applyNoiseReduction(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const denoisedAudio = await AudioAnalysisModule.reduceNoise(audioMedia.uri, {
                spectralSubtraction: true,
                wienerFilter: true,
                noiseProfile: 'automatic'
            });

            return {
                ...audioMedia,
                uri: denoisedAudio.uri,
                denoised: true
            };
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Noise reduction failed: ${error.message}`);
            return audioMedia;
        }
    }

    /**
     * Apply level normalization
     */
    async applyLevelNormalization(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const normalizedAudio = await AudioAnalysisModule.normalizeLevels(audioMedia.uri, {
                targetLevel: -16,  // Standard speech level in dB
                peakLimiting: true,
                compressionRatio: 3.0
            });

            return {
                ...audioMedia,
                uri: normalizedAudio.uri,
                normalized: true
            };
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Level normalization failed: ${error.message}`);
            return audioMedia;
        }
    }

    /**
     * Detect speech segments in audio
     */
    async detectSpeechSegments(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const segments = await AudioAnalysisModule.detectSpeechSegments(audioMedia.uri);
            
            return segments.map(segment => ({
                startTime: segment.startTime,
                endTime: segment.endTime,
                confidence: segment.confidence,
                duration: segment.endTime - segment.startTime
            }));
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Speech segment detection failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Calculate average speech level
     */
    async calculateAverageSpeechLevel(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const speechLevel = await AudioAnalysisModule.calculateSpeechLevel(audioMedia.uri);
            
            return speechLevel.averageLevel;
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Speech level calculation failed: ${error.message}`);
            return 0;
        }
    }

    /**
     * Calculate current noise level
     */
    async calculateNoiseLevel(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const noiseLevel = await AudioAnalysisModule.estimateNoiseLevel(audioMedia.uri);
            
            return noiseLevel.level;
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Noise level calculation failed: ${error.message}`);
            return 0;
        }
    }

    /**
     * Calculate RMS level
     */
    async calculateRMSLevel(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const rmsLevel = await AudioAnalysisModule.calculateRMSLevel(audioMedia.uri);
            
            return rmsLevel.level;
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `RMS level calculation failed: ${error.message}`);
            return 0;
        }
    }

    /**
     * Validate speech-specific requirements
     */
    async validateRawInput(context) {
        await super.validateRawInput(context);
        
        const { rawMedia } = context;
        
        // Check if this is a suitable audio format for speech recognition
        const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac'];
        if (!supportedFormats.includes(rawMedia.mimeType)) {
            throw PipelineStageError.preprocessingError(
                'UNSUPPORTED_AUDIO_FORMAT',
                `Audio format ${rawMedia.mimeType} is not supported for speech recognition`
            );
        }

        // Check minimum duration for speech recognition
        const minSpeechDuration = 1.0; // 1 second minimum
        if (rawMedia.duration && rawMedia.duration < minSpeechDuration) {
            throw PipelineStageError.preprocessingError(
                'SPEECH_TOO_SHORT',
                `Audio recording is too short for speech recognition. Minimum duration is ${minSpeechDuration} seconds.`
            );
        }

        General.logDebug('SpeechPreProcessor', 'Speech validation passed');
    }

    /**
     * Extract speech-specific metadata
     */
    async extractAudioMetadata(audioMedia) {
        const baseMetadata = await super.extractAudioMetadata(audioMedia);
        
        // Add speech-specific metadata
        return {
            ...baseMetadata,
            speechAnalysis: {
                voiceActivityDetected: await this.detectVoiceActivity(audioMedia),
                speechRate: await this.estimateSpeechRate(audioMedia),
                pitchRange: await this.analyzePitchRange(audioMedia),
                formants: await this.extractFormants(audioMedia)
            }
        };
    }

    /**
     * Detect voice activity in audio
     */
    async detectVoiceActivity(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const vadResult = await AudioAnalysisModule.detectVoiceActivity(audioMedia.uri);
            
            return {
                hasSpeech: vadResult.hasSpeech,
                speechRatio: vadResult.speechRatio,
                confidence: vadResult.confidence
            };
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Voice activity detection failed: ${error.message}`);
            return { hasSpeech: false, speechRatio: 0, confidence: 0 };
        }
    }

    /**
     * Estimate speech rate (words per minute)
     */
    async estimateSpeechRate(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const speechRate = await AudioAnalysisModule.estimateSpeechRate(audioMedia.uri);
            
            return speechRate.wordsPerMinute;
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Speech rate estimation failed: ${error.message}`);
            return 0;
        }
    }

    /**
     * Analyze pitch range
     */
    async analyzePitchRange(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const pitchAnalysis = await AudioAnalysisModule.analyzePitch(audioMedia.uri);
            
            return {
                minPitch: pitchAnalysis.minPitch,
                maxPitch: pitchAnalysis.maxPitch,
                meanPitch: pitchAnalysis.meanPitch,
                pitchRange: pitchAnalysis.maxPitch - pitchAnalysis.minPitch
            };
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Pitch analysis failed: ${error.message}`);
            return { minPitch: 0, maxPitch: 0, meanPitch: 0, pitchRange: 0 };
        }
    }

    /**
     * Extract formants for speech analysis
     */
    async extractFormants(audioMedia) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const formants = await AudioAnalysisModule.extractFormants(audioMedia.uri);
            
            return {
                f1: formants.firstFormant,
                f2: formants.secondFormant,
                f3: formants.thirdFormant
            };
            
        } catch (error) {
            General.logWarn('SpeechPreProcessor', `Formant extraction failed: ${error.message}`);
            return { f1: 0, f2: 0, f3: 0 };
        }
    }
}

export default SpeechPreProcessor;
