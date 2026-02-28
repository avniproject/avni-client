// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * BrightnessGate - Detects lighting issues in images.
 * Checks for too dark, too bright, and low contrast conditions.
 */
class BrightnessGate extends BaseQualityGate {
    constructor() {
        super();
    }

    /**
     * Get supported media types
     */
    getSupportedMediaTypes() {
        return ['image/jpeg', 'image/png', 'image/webp'];
    }

    /**
     * Check image quality for brightness and contrast
     */
    async checkQuality(context) {
        const metadata = context.mediaMetadata;
        const brightnessStats = metadata.brightnessStats || {};
        
        const mean = brightnessStats.mean || 0;
        const std = brightnessStats.std || 0;
        
        // Thresholds for brightness and contrast
        const TOO_DARK_THRESHOLD = 40;
        const TOO_BRIGHT_THRESHOLD = 220;
        const LOW_CONTRAST_THRESHOLD = 15;
        
        // Calculate scores for each aspect
        const brightnessScore = this.calculateBrightnessScore(mean);
        const contrastScore = this.calculateContrastScore(std);
        
        // Overall score is minimum of brightness and contrast scores
        const overallScore = Math.min(brightnessScore, contrastScore);
        
        // Check for blocking issues
        if (mean < TOO_DARK_THRESHOLD) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.TOO_DARK,
                'Image is too dark. Please improve lighting conditions.',
                `Brightness mean: ${mean.toFixed(1)} (threshold: ${TOO_DARK_THRESHOLD})`,
                true,
                overallScore,
                { mean, std, issue: 'too_dark' }
            );
        }
        
        if (mean > TOO_BRIGHT_THRESHOLD) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.TOO_BRIGHT,
                'Image is too bright. Please reduce lighting or adjust camera angle.',
                `Brightness mean: ${mean.toFixed(1)} (threshold: ${TOO_BRIGHT_THRESHOLD})`,
                true,
                overallScore,
                { mean, std, issue: 'too_bright' }
            );
        }
        
        if (std < LOW_CONTRAST_THRESHOLD) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.LOW_CONTRAST,
                'Image has low contrast. Please adjust lighting for better contrast.',
                `Brightness std: ${std.toFixed(1)} (threshold: ${LOW_CONTRAST_THRESHOLD})`,
                true,
                overallScore,
                { mean, std, issue: 'low_contrast' }
            );
        }
        
        // Check for warning conditions
        if (mean < TOO_DARK_THRESHOLD + 20) {
            return this.createWarningResult(
                'Image is somewhat dark. Results may be less accurate.',
                overallScore,
                { mean, std, issue: 'slightly_dark' }
            );
        }
        
        if (mean > TOO_BRIGHT_THRESHOLD - 20) {
            return this.createWarningResult(
                'Image is somewhat bright. Results may be less accurate.',
                overallScore,
                { mean, std, issue: 'slightly_bright' }
            );
        }
        
        if (std < LOW_CONTRAST_THRESHOLD + 10) {
            return this.createWarningResult(
                'Image has somewhat low contrast. Results may be less accurate.',
                overallScore,
                { mean, std, issue: 'slightly_low_contrast' }
            );
        }
        
        return this.createPassResult(
            overallScore,
            { mean, std, brightnessScore, contrastScore, issue: 'good' }
        );
    }

    /**
     * Calculate brightness score from mean brightness
     * @param {number} mean - Mean brightness value
     * @returns {number} Score (0-100)
     */
    calculateBrightnessScore(mean) {
        // Optimal brightness range: 80-180
        const OPTIMAL_MIN = 80;
        const OPTIMAL_MAX = 180;
        
        if (mean >= OPTIMAL_MIN && mean <= OPTIMAL_MAX) {
            return 100;
        }
        
        if (mean < OPTIMAL_MIN) {
            // Too dark - score decreases linearly
            return this.normalizeTo100(mean, 0, OPTIMAL_MIN);
        }
        
        // Too bright - score decreases linearly
        return this.normalizeTo100(255 - mean, 0, 255 - OPTIMAL_MAX);
    }

    /**
     * Calculate contrast score from standard deviation
     * @param {number} std - Standard deviation of brightness
     * @returns {number} Score (0-100)
     */
    calculateContrastScore(std) {
        // Good contrast: std > 30, excellent: std > 50
        const GOOD_CONTRAST = 30;
        const EXCELLENT_CONTRAST = 50;
        
        if (std >= EXCELLENT_CONTRAST) {
            return 100;
        }
        
        if (std >= GOOD_CONTRAST) {
            // Linear interpolation between good and excellent
            return this.normalizeTo100(std, GOOD_CONTRAST, EXCELLENT_CONTRAST) * 0.5 + 50;
        }
        
        // Poor contrast - score decreases linearly
        return this.normalizeTo100(std, 0, GOOD_CONTRAST) * 0.5;
    }

    /**
     * Get lighting condition description
     * @param {number} mean - Mean brightness
     * @param {number} std - Standard deviation
     * @returns {string} Lighting description
     */
    getLightingDescription(mean, std) {
        if (mean < 40) return 'Very dark';
        if (mean < 80) return 'Dark';
        if (mean < 120) return 'Dim';
        if (mean <= 180) return 'Good';
        if (mean <= 220) return 'Bright';
        return 'Very bright';
    }

    /**
     * Get contrast description
     * @param {number} std - Standard deviation
     * @returns {string} Contrast description
     */
    getContrastDescription(std) {
        if (std < 15) return 'Very low contrast';
        if (std < 25) return 'Low contrast';
        if (std < 40) return 'Moderate contrast';
        if (std < 60) return 'Good contrast';
        return 'Excellent contrast';
    }

    /**
     * Get recommendations for improving lighting
     * @param {number} mean - Mean brightness
     * @param {number} std - Standard deviation
     * @returns {string[]} Recommendations
     */
    getLightingRecommendations(mean, std) {
        const recommendations = [];
        
        if (mean < 40) {
            recommendations.push('Move to a well-lit area');
            recommendations.push('Use additional light sources');
            recommendations.push('Avoid shooting in shadowed areas');
        } else if (mean < 80) {
            recommendations.push('Increase lighting slightly');
            recommendations.push('Open curtains or blinds');
        } else if (mean > 220) {
            recommendations.push('Reduce lighting intensity');
            recommendations.push('Move away from direct light sources');
            recommendations.push('Use diffused lighting instead of direct light');
        } else if (mean > 180) {
            recommendations.push('Slightly reduce lighting');
            recommendations.push('Adjust camera angle away from bright light');
        }
        
        if (std < 15) {
            recommendations.push('Ensure even lighting to reduce shadows');
            recommendations.push('Use multiple light sources from different angles');
            recommendations.push('Avoid backlighting');
        } else if (std < 25) {
            recommendations.push('Improve lighting contrast');
            recommendations.push('Position lights to create gentle shadows');
        }
        
        return recommendations;
    }

    /**
     * Get gate priority (brightness is critical for medical imaging)
     */
    getPriority() {
        return 85;
    }

    /**
     * Get execution cost (brightness analysis is cheap)
     */
    getExecutionCost() {
        return 15;
    }
}

export default BrightnessGate;
