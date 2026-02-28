// @flow
import BasePreProcessor from '../BasePreProcessor';
import PipelineStageError from '../../pipeline/PipelineStageError';
import General from "../../../../utility/General";

/**
 * AudioPreProcessor - Base preprocessor for all audio types.
 * Provides common audio processing functionality.
 */
class AudioPreProcessor extends BasePreProcessor {
    constructor() {
        super();
    }

    /**
     * Get quality gate names for audio preprocessing
     */
    getQualityGateNames() {
        return ['SilenceGate', 'ClippingGate'];
    }

    /**
     * Validate audio-specific requirements
     */
    async validateRawInput(context) {
        await super.validateRawInput(context);
        
        const { rawMedia } = context;
        
        // Additional audio-specific validations
        if (!this.isAudioType(rawMedia.mimeType)) {
            throw PipelineStageError.preprocessingError(
                'INVALID_MEDIA_TYPE',
                'Expected audio media but received different type'
            );
        }

        // Check minimum duration (prevent empty/corrupt audio)
        if (rawMedia.duration && rawMedia.duration < 0.5) {
            throw PipelineStageError.preprocessingError(
                'AUDIO_TOO_SHORT',
                'Audio recording is too short. Please record for at least 1 second.'
            );
        }

        // Check maximum duration (prevent excessively long recordings)
        const maxDuration = context.aiConfig.captureConfig?.maxDurationSeconds || 30;
        if (rawMedia.duration && rawMedia.duration > maxDuration) {
            throw PipelineStageError.preprocessingError(
                'AUDIO_TOO_LONG',
                `Audio recording is too long. Maximum duration is ${maxDuration} seconds.`
            );
        }

        General.logDebug('AudioPreProcessor', 'Audio validation passed');
    }

    /**
     * Audio-specific normalization
     */
    async normalizeAudio(rawMedia) {
        try {
            // Use native AudioAnalysisModule for normalization
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const normalizedAudio = await AudioAnalysisModule.normalize(rawMedia.uri, {
                sampleRate: 16000, // Standard for speech models
                channels: 1, // Mono
                format: 'WAV',
                normalizeVolume: true,
                removeDCOffset: true
            });

            return {
                ...rawMedia,
                uri: normalizedAudio.uri,
                normalized: true,
                sampleRate: 16000,
                channels: 1,
                format: 'WAV'
            };
            
        } catch (error) {
            // Fallback to original if native module fails
            General.logWarn('AudioPreProcessor', `Native normalization failed: ${error.message}`);
            return rawMedia;
        }
    }

    /**
     * Extract audio-specific metadata
     */
    async extractAudioMetadata(audioMedia) {
        try {
            // Use native AudioAnalysisModule for metadata extraction
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const metadata = await AudioAnalysisModule.getMetadata(audioMedia.uri);
            
            return {
                duration: metadata.duration,
                sampleRate: metadata.sampleRate,
                channels: metadata.channels,
                bitRate: metadata.bitRate,
                format: metadata.format,
                rmsLevel: metadata.rmsLevel,
                peakLevel: metadata.peakLevel,
                silenceRatio: metadata.silenceRatio,
                snr: metadata.snr,
                dynamicRange: metadata.dynamicRange,
                zeroCrossingRate: metadata.zeroCrossingRate,
                spectralCentroid: metadata.spectralCentroid,
                fileSize: audioMedia.uri ? await this.getFileSize(audioMedia.uri) : 0
            };
            
        } catch (error) {
            // Fallback to basic metadata if native module fails
            General.logWarn('AudioPreProcessor', `Metadata extraction failed: ${error.message}`);
            return await super.extractAudioMetadata(audioMedia);
        }
    }

    /**
     * Prepare audio for quality gates
     */
    async prepareForQualityGates(context) {
        try {
            const { processedMedia, rawMedia } = context;
            
            // For audio, we typically don't need resizing
            // But we might want to extract segments for analysis
            if (processedMedia.duration && processedMedia.duration > 10) {
                // Extract first 10 seconds for quality analysis
                context.processedMedia = await this.extractAudioSegment(processedMedia, 0, 10);
            }
            
            General.logDebug('AudioPreProcessor', 'Audio prepared for quality gates');
            
        } catch (error) {
            throw PipelineStageError.preprocessingError(
                'QUALITY_PREPARATION_FAILED',
                'Failed to prepare audio for quality analysis',
                error.message
            );
        }
    }

    /**
     * Extract a segment of audio for analysis
     */
    async extractAudioSegment(audioMedia, startTime, duration) {
        try {
            const { AudioAnalysisModule } = require('../../../../framework/NativeModules');
            
            const segment = await AudioAnalysisModule.extractSegment(audioMedia.uri, startTime, duration);
            
            return {
                ...audioMedia,
                uri: segment.uri,
                duration: segment.duration,
                segment: { startTime, duration }
            };
            
        } catch (error) {
            General.logWarn('AudioPreProcessor', `Audio segment extraction failed: ${error.message}`);
            return audioMedia;
        }
    }

    /**
     * Get file size for audio file
     */
    async getFileSize(uri) {
        try {
            const fs = require('react-native-fs');
            const stat = await fs.stat(uri);
            return stat.size;
        } catch (error) {
            General.logWarn('AudioPreProcessor', `File size check failed: ${error.message}`);
            return 0;
        }
    }

    /**
     * Check if audio meets minimum quality requirements
     */
    meetsMinimumQuality(metadata) {
        const minSampleRate = 8000;
        const minDuration = 0.5;
        const maxSilenceRatio = 0.9;
        
        return metadata.sampleRate >= minSampleRate &&
               metadata.duration >= minDuration &&
               metadata.silenceRatio <= maxSilenceRatio;
    }

    /**
     * Calculate audio quality metrics
     */
    calculateQualityMetrics(metadata) {
        return {
            signalQuality: this.calculateSignalQuality(metadata),
            clarity: this.calculateClarity(metadata),
            volume: this.calculateVolumeLevel(metadata),
            noise: this.calculateNoiseLevel(metadata)
        };
    }

    /**
     * Calculate overall signal quality
     */
    calculateSignalQuality(metadata) {
        const snr = metadata.snr || 0;
        const dynamicRange = metadata.dynamicRange || 0;
        const peakLevel = metadata.peakLevel || 0;
        
        // Simple quality calculation based on SNR and dynamic range
        let quality = 0;
        
        // SNR contribution (0-40 points)
        quality += Math.min(40, Math.max(0, snr));
        
        // Dynamic range contribution (0-30 points)
        quality += Math.min(30, Math.max(0, dynamicRange * 30));
        
        // Peak level contribution (0-30 points, optimal around 0.8)
        const optimalPeak = 0.8;
        const peakScore = 30 - Math.abs(peakLevel - optimalPeak) * 30;
        quality += Math.max(0, peakScore);
        
        return Math.min(100, quality);
    }

    /**
     * Calculate audio clarity
     */
    calculateClarity(metadata) {
        const spectralCentroid = metadata.spectralCentroid || 0;
        const zeroCrossingRate = metadata.zeroCrossingRate || 0;
        
        // Clarity based on spectral characteristics
        return Math.min(100, (spectralCentroid / 2000) * 50 + (1 - zeroCrossingRate) * 50);
    }

    /**
     * Calculate volume level
     */
    calculateVolumeLevel(metadata) {
        const rmsLevel = metadata.rmsLevel || 0;
        
        // Convert RMS to percentage (0-100)
        return Math.min(100, rmsLevel * 100);
    }

    /**
     * Calculate noise level
     */
    calculateNoiseLevel(metadata) {
        const silenceRatio = metadata.silenceRatio || 0;
        const snr = metadata.snr || 0;
        
        // Noise level based on silence ratio and SNR
        const noiseFromSilence = silenceRatio * 50;
        const noiseFromSNR = Math.max(0, (20 - snr) * 2.5);
        
        return Math.min(100, noiseFromSilence + noiseFromSNR);
    }
}

export default AudioPreProcessor;
