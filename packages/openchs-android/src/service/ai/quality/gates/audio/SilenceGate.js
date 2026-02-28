// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * SilenceGate - Detects excessive silence in audio recordings.
 * Ensures sufficient speech content for analysis.
 */
class SilenceGate extends BaseQualityGate {
    constructor() {
        super();
    }

    /**
     * Get supported media types
     */
    getSupportedMediaTypes() {
        return ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac'];
    }

    /**
     * Check audio quality for silence
     */
    async checkQuality(context) {
        const metadata = context.mediaMetadata;
        const silenceRatio = metadata.silenceRatio || 0;
        const duration = metadata.duration || 0;
        
        // Thresholds for silence detection
        const MAX_SILENCE_RATIO = 0.8;
        const WARNING_SILENCE_RATIO = 0.6;
        const MIN_DURATION = 1.0; // Minimum 1 second
        
        // Calculate score based on silence ratio
        const score = this.calculateSilenceScore(silenceRatio);
        
        // Check minimum duration
        if (duration < MIN_DURATION) {
            return this.createFailResult(
                'AUDIO_TOO_SHORT',
                `Audio recording is too short (${duration.toFixed(1)}s). Minimum required: ${MIN_DURATION}s.`,
                `Duration: ${duration.toFixed(1)}s, Silence ratio: ${(silenceRatio * 100).toFixed(1)}%`,
                true,
                score,
                { duration, silenceRatio, issue: 'too_short' }
            );
        }
        
        // Check for excessive silence
        if (silenceRatio > MAX_SILENCE_RATIO) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.TOO_MUCH_SILENCE,
                `Recording contains too much silence (${(silenceRatio * 100).toFixed(1)}%). Please speak clearly and continuously.`,
                `Silence ratio: ${(silenceRatio * 100).toFixed(1)}% (threshold: ${(MAX_SILENCE_RATIO * 100).toFixed(1)}%)`,
                true,
                score,
                { duration, silenceRatio, issue: 'too_much_silence' }
            );
        }
        
        // Check for warning conditions
        if (silenceRatio > WARNING_SILENCE_RATIO) {
            return this.createWarningResult(
                `Recording has significant silence (${(silenceRatio * 100).toFixed(1)}%). Results may be less accurate.`,
                score,
                { duration, silenceRatio, issue: 'high_silence' }
            );
        }
        
        return this.createPassResult(
            score,
            { duration, silenceRatio, issue: 'good_audio' }
        );
    }

    /**
     * Calculate silence score
     * @param {number} silenceRatio - Ratio of silence to total audio (0-1)
     * @returns {number} Score (0-100)
     */
    calculateSilenceScore(silenceRatio) {
        // Lower silence ratio is better
        // Score decreases linearly as silence increases
        const score = (1 - silenceRatio) * 100;
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Get silence level description
     * @param {number} silenceRatio - Silence ratio
     * @returns {string} Description
     */
    getSilenceDescription(silenceRatio) {
        if (silenceRatio > 0.8) return 'Excessive silence';
        if (silenceRatio > 0.6) return 'High silence';
        if (silenceRatio > 0.4) return 'Moderate silence';
        if (silenceRatio > 0.2) return 'Low silence';
        return 'Minimal silence';
    }

    /**
     * Get speech activity description
     * @param {number} silenceRatio - Silence ratio
     * @returns {string} Speech activity description
     */
    getSpeechActivityDescription(silenceRatio) {
        const speechRatio = 1 - silenceRatio;
        if (speechRatio < 0.2) return 'Very little speech';
        if (speechRatio < 0.4) return 'Limited speech';
        if (speechRatio < 0.6) return 'Moderate speech';
        if (speechRatio < 0.8) return 'Good speech activity';
        return 'Excellent speech activity';
    }

    /**
     * Get recommendations for reducing silence
     * @param {number} silenceRatio - Silence ratio
     * @param {number} duration - Audio duration
     * @returns {string[]} Recommendations
     */
    getSilenceRecommendations(silenceRatio, duration) {
        const recommendations = [];
        
        if (silenceRatio > 0.8) {
            recommendations.push('Speak continuously throughout the recording');
            recommendations.push('Ensure you are speaking clearly and at a normal volume');
            recommendations.push('Check that the microphone is working properly');
        } else if (silenceRatio > 0.6) {
            recommendations.push('Try to speak more continuously');
            recommendations.push('Reduce pauses between words');
        } else if (silenceRatio > 0.4) {
            recommendations.push('Minimize pauses and silent periods');
        }
        
        if (duration < 2.0) {
            recommendations.push('Record for a longer duration to capture more speech');
        }
        
        // General recommendations
        recommendations.push('Speak clearly and at a consistent volume');
        recommendations.push('Ensure the microphone is close enough to pick up speech');
        recommendations.push('Record in a quiet environment to reduce background noise');
        
        return recommendations;
    }

    /**
     * Estimate speech content duration
     * @param {number} totalDuration - Total audio duration
     * @param {number} silenceRatio - Silence ratio
     * @returns {number} Estimated speech duration
     */
    estimateSpeechDuration(totalDuration, silenceRatio) {
        return totalDuration * (1 - silenceRatio);
    }

    /**
     * Check if audio has sufficient speech for analysis
     * @param {number} duration - Audio duration
     * @param {number} silenceRatio - Silence ratio
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Suitability assessment
     */
    checkSpeechSuitability(duration, silenceRatio, analysisType) {
        const speechDuration = this.estimateSpeechDuration(duration, silenceRatio);
        
        const requirements = {
            transcription: { minSpeech: 2.0, maxSilence: 0.7 },
            speech_analysis: { minSpeech: 1.0, maxSilence: 0.8 },
            voice_activity: { minSpeech: 0.5, maxSilence: 0.9 }
        };
        
        const requirement = requirements[analysisType] || requirements.speech_analysis;
        
        const suitable = speechDuration >= requirement.minSpeech && 
                        silenceRatio <= requirement.maxSilence;
        
        const recommendations = [];
        
        if (speechDuration < requirement.minSpeech) {
            recommendations.push(`Need at least ${requirement.minSpeech}s of speech for ${analysisType}`);
            recommendations.push('Speak more or record for longer duration');
        }
        
        if (silenceRatio > requirement.maxSilence) {
            recommendations.push(`Silence ratio too high for ${analysisType}`);
            recommendations.push('Reduce pauses and speak more continuously');
        }
        
        return {
            suitable,
            speechDuration,
            recommendations,
            requirement
        };
    }

    /**
     * Analyze silence patterns
     * @param {Object} audioSegments - Audio segment analysis
     * @returns {Object} Silence pattern analysis
     */
    analyzeSilencePatterns(audioSegments) {
        if (!audioSegments || !audioSegments.segments) {
            return { patterns: [], averageSilenceDuration: 0, longestSilence: 0 };
        }
        
        const segments = audioSegments.segments;
        const silenceSegments = segments.filter(segment => segment.type === 'silence');
        
        if (silenceSegments.length === 0) {
            return { patterns: [], averageSilenceDuration: 0, longestSilence: 0 };
        }
        
        const silenceDurations = silenceSegments.map(segment => segment.duration);
        const averageSilenceDuration = silenceDurations.reduce((sum, duration) => sum + duration, 0) / silenceDurations.length;
        const longestSilence = Math.max(...silenceDurations);
        
        // Identify patterns
        const patterns = [];
        
        if (longestSilence > 3.0) {
            patterns.push('Long pauses detected');
        }
        
        if (averageSilenceDuration > 1.0) {
            patterns.push('Frequent long pauses');
        }
        
        if (silenceSegments.length > segments.length * 0.5) {
            patterns.push('More silence than speech');
        }
        
        return {
            patterns,
            averageSilenceDuration,
            longestSilence,
            silenceSegmentCount: silenceSegments.length
        };
    }

    /**
     * Get gate priority (silence detection is important for speech analysis)
     */
    getPriority() {
        return 75;
    }

    /**
     * Get execution cost (silence analysis is cheap)
     */
    getExecutionCost() {
        return 25;
    }
}

export default SilenceGate;
