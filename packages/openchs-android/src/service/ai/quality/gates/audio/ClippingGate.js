// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * ClippingGate - Detects audio clipping (distortion from over-amplification).
 * Ensures audio levels are within acceptable range to avoid distortion.
 */
class ClippingGate extends BaseQualityGate {
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
     * Check audio quality for clipping
     */
    async checkQuality(context) {
        const metadata = context.mediaMetadata;
        const peakLevel = metadata.peakLevel || 0;
        const rmsLevel = metadata.rmsLevel || 0;
        const dynamicRange = metadata.dynamicRange || 0;
        
        // Thresholds for clipping detection
        const CLIPPING_THRESHOLD = 0.98;
        const WARNING_THRESHOLD = 0.9;
        const MIN_DYNAMIC_RANGE = 10; // dB
        const MIN_RMS_LEVEL = 0.1; // Minimum RMS to detect very quiet audio
        
        // Calculate scores
        const clippingScore = this.calculateClippingScore(peakLevel);
        const dynamicRangeScore = this.calculateDynamicRangeScore(dynamicRange);
        const overallScore = Math.min(clippingScore, dynamicRangeScore);
        
        // Check for clipping
        if (peakLevel >= CLIPPING_THRESHOLD) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.AUDIO_CLIPPING,
                'Audio is distorted (clipping). Please speak further from the microphone or reduce volume.',
                `Peak level: ${(peakLevel * 100).toFixed(1)}% (threshold: ${(CLIPPING_THRESHOLD * 100).toFixed(1)}%)`,
                true,
                overallScore,
                { peakLevel, rmsLevel, dynamicRange, issue: 'clipping' }
            );
        }
        
        // Check for very low dynamic range (possible compression issues)
        if (dynamicRange < MIN_DYNAMIC_RANGE) {
            return this.createWarningResult(
                `Audio has low dynamic range (${dynamicRange.toFixed(1)}dB). This may affect analysis quality.`,
                overallScore,
                { peakLevel, rmsLevel, dynamicRange, issue: 'low_dynamic_range' }
            );
        }
        
        // Check for warning conditions
        if (peakLevel >= WARNING_THRESHOLD) {
            return this.createWarningResult(
                `Audio levels are high (${(peakLevel * 100).toFixed(1)}%). Risk of distortion.`,
                overallScore,
                { peakLevel, rmsLevel, dynamicRange, issue: 'high_levels' }
            );
        }
        
        // Check for very quiet audio
        if (rmsLevel < MIN_RMS_LEVEL) {
            return this.createWarningResult(
                `Audio levels are very low (${(rmsLevel * 100).toFixed(1)}%). Speak closer to the microphone.`,
                overallScore,
                { peakLevel, rmsLevel, dynamicRange, issue: 'low_levels' }
            );
        }
        
        return this.createPassResult(
            overallScore,
            { peakLevel, rmsLevel, dynamicRange, issue: 'good_levels' }
        );
    }

    /**
     * Calculate clipping score based on peak level
     * @param {number} peakLevel - Peak audio level (0-1)
     * @returns {number} Score (0-100)
     */
    calculateClippingScore(peakLevel) {
        // Optimal peak level: 0.7-0.85
        const OPTIMAL_MIN = 0.7;
        const OPTIMAL_MAX = 0.85;
        
        if (peakLevel < OPTIMAL_MIN) {
            // Too quiet - score decreases linearly
            return this.normalizeTo100(peakLevel, 0, OPTIMAL_MIN) * 0.8;
        }
        
        if (peakLevel <= OPTIMAL_MAX) {
            // Optimal range - full score
            return 100;
        }
        
        // Too loud - score decreases rapidly
        const excess = peakLevel - OPTIMAL_MAX;
        const maxExcess = 1.0 - OPTIMAL_MAX;
        return Math.max(0, 100 - (excess / maxExcess) * 100);
    }

    /**
     * Calculate dynamic range score
     * @param {number} dynamicRange - Dynamic range in dB
     * @returns {number} Score (0-100)
     */
    calculateDynamicRangeScore(dynamicRange) {
        // Good dynamic range: 20-60dB
        const GOOD_MIN = 20;
        const GOOD_MAX = 60;
        const EXCELLENT_MIN = 30;
        const EXCELLENT_MAX = 50;
        
        if (dynamicRange < GOOD_MIN) {
            // Poor dynamic range
            return this.normalizeTo100(dynamicRange, 0, GOOD_MIN) * 0.5;
        }
        
        if (dynamicRange >= EXCELLENT_MIN && dynamicRange <= EXCELLENT_MAX) {
            // Excellent dynamic range
            return 100;
        }
        
        if (dynamicRange <= GOOD_MAX) {
            // Good dynamic range
            return 80 + this.normalizeTo100(dynamicRange, GOOD_MIN, EXCELLENT_MIN) * 0.2;
        }
        
        // Very high dynamic range - might be noisy
        const excess = dynamicRange - GOOD_MAX;
        return Math.max(70, 90 - excess);
    }

    /**
     * Get audio level description
     * @param {number} peakLevel - Peak level (0-1)
     * @param {number} rmsLevel - RMS level (0-1)
     * @returns {string} Level description
     */
    getAudioLevelDescription(peakLevel, rmsLevel) {
        if (peakLevel >= 0.98) return 'Clipping/distorted';
        if (peakLevel >= 0.9) return 'Very high levels';
        if (peakLevel >= 0.85) return 'High levels';
        if (peakLevel >= 0.7) return 'Good levels';
        if (peakLevel >= 0.5) return 'Moderate levels';
        if (peakLevel >= 0.3) return 'Low levels';
        return 'Very low levels';
    }

    /**
     * Get dynamic range description
     * @param {number} dynamicRange - Dynamic range in dB
     * @returns {string} Dynamic range description
     */
    getDynamicRangeDescription(dynamicRange) {
        if (dynamicRange < 10) return 'Very poor dynamic range';
        if (dynamicRange < 20) return 'Poor dynamic range';
        if (dynamicRange < 30) return 'Fair dynamic range';
        if (dynamicRange < 50) return 'Good dynamic range';
        if (dynamicRange < 70) return 'Excellent dynamic range';
        return 'Very wide dynamic range';
    }

    /**
     * Get clipping severity description
     * @param {number} peakLevel - Peak level (0-1)
     * @returns {string} Clipping severity
     */
    getClippingSeverity(peakLevel) {
        if (peakLevel >= 0.99) return 'severe';
        if (peakLevel >= 0.98) return 'moderate';
        if (peakLevel >= 0.95) return 'mild';
        return 'none';
    }

    /**
     * Get recommendations for improving audio levels
     * @param {number} peakLevel - Peak level
     * @param {number} rmsLevel - RMS level
     * @param {number} dynamicRange - Dynamic range
     * @returns {string[]} Recommendations
     */
    getAudioLevelRecommendations(peakLevel, rmsLevel, dynamicRange) {
        const recommendations = [];
        
        if (peakLevel >= 0.98) {
            recommendations.push('Move further from the microphone');
            recommendations.push('Speak more softly');
            recommendations.push('Reduce input volume if possible');
        } else if (peakLevel >= 0.9) {
            recommendations.push('Speak slightly further from the microphone');
            recommendations.push('Reduce speaking volume slightly');
        } else if (peakLevel < 0.3) {
            recommendations.push('Move closer to the microphone');
            recommendations.push('Speak more loudly and clearly');
            recommendations.push('Check microphone placement');
        } else if (rmsLevel < 0.1) {
            recommendations.push('Speak closer to the microphone');
            recommendations.push('Ensure microphone is not obstructed');
        }
        
        if (dynamicRange < 20) {
            recommendations.push('Ensure consistent speaking volume');
            recommendations.push('Avoid speaking too close to the microphone');
            recommendations.push('Check for automatic gain control issues');
        }
        
        // General recommendations
        recommendations.push('Speak clearly and at a consistent volume');
        recommendations.push('Maintain consistent distance from microphone');
        recommendations.push('Record in a quiet environment');
        
        return recommendations;
    }

    /**
     * Estimate headroom (how much space before clipping)
     * @param {number} peakLevel - Peak level (0-1)
     * @returns {number} Headroom in dB
     */
    estimateHeadroom(peakLevel) {
        if (peakLevel <= 0) return Infinity;
        
        // Convert to dB
        const peakDb = 20 * Math.log10(peakLevel);
        const maxDb = 0; // 0 dB is maximum digital level
        
        return maxDb - peakDb;
    }

    /**
     * Check if audio is suitable for specific analysis types
     * @param {number} peakLevel - Peak level
     * @param {number} rmsLevel - RMS level
     * @param {number} dynamicRange - Dynamic range
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Suitability assessment
     */
    checkAnalysisSuitability(peakLevel, rmsLevel, dynamicRange, analysisType) {
        const requirements = {
            transcription: { maxPeak: 0.9, minRMS: 0.1, minDynamicRange: 15 },
            speech_analysis: { maxPeak: 0.95, minRMS: 0.05, minDynamicRange: 10 },
            voice_activity: { maxPeak: 0.98, minRMS: 0.02, minDynamicRange: 5 }
        };
        
        const requirement = requirements[analysisType] || requirements.speech_analysis;
        
        const suitable = peakLevel <= requirement.maxPeak && 
                        rmsLevel >= requirement.minRMS && 
                        dynamicRange >= requirement.minDynamicRange;
        
        const recommendations = [];
        
        if (peakLevel > requirement.maxPeak) {
            recommendations.push(`Peak level too high for ${analysisType}`);
            recommendations.push('Reduce audio levels to avoid distortion');
        }
        
        if (rmsLevel < requirement.minRMS) {
            recommendations.push(`Audio too quiet for ${analysisType}`);
            recommendations.push('Increase speaking volume or move closer to microphone');
        }
        
        if (dynamicRange < requirement.minDynamicRange) {
            recommendations.push(`Dynamic range too low for ${analysisType}`);
            recommendations.push('Ensure more consistent speaking volume');
        }
        
        return {
            suitable,
            recommendations,
            requirement,
            headroom: this.estimateHeadroom(peakLevel)
        };
    }

    /**
     * Analyze clipping patterns
     * @param {Object} audioAnalysis - Detailed audio analysis
     * @returns {Object} Clipping pattern analysis
     */
    analyzeClippingPatterns(audioAnalysis) {
        if (!audioAnalysis || !audioAnalysis.clippingEvents) {
            return { patterns: [], clippingCount: 0, totalClippingDuration: 0 };
        }
        
        const clippingEvents = audioAnalysis.clippingEvents;
        const clippingCount = clippingEvents.length;
        const totalClippingDuration = clippingEvents.reduce((sum, event) => sum + event.duration, 0);
        
        const patterns = [];
        
        if (clippingCount > 10) {
            patterns.push('Frequent clipping detected');
        }
        
        if (totalClippingDuration > 1.0) {
            patterns.push('Extended clipping periods');
        }
        
        // Check if clipping occurs at specific times
        const clippingTimes = clippingEvents.map(event => event.startTime);
        if (clippingTimes.length > 0) {
            const avgTime = clippingTimes.reduce((sum, time) => sum + time, 0) / clippingTimes.length;
            if (avgTime < 1.0) {
                patterns.push('Clipping occurs early in recording');
            } else if (avgTime > audioAnalysis.duration - 1.0) {
                patterns.push('Clipping occurs late in recording');
            }
        }
        
        return {
            patterns,
            clippingCount,
            totalClippingDuration,
            averageClippingDuration: clippingCount > 0 ? totalClippingDuration / clippingCount : 0
        };
    }

    /**
     * Get gate priority (clipping detection is important for audio quality)
     */
    getPriority() {
        return 80;
    }

    /**
     * Get execution cost (clipping analysis is cheap)
     */
    getExecutionCost() {
        return 20;
    }
}

export default ClippingGate;
