// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * ResolutionGate - Checks if image resolution meets minimum requirements.
 * Ensures images have sufficient pixels for accurate analysis.
 */
class ResolutionGate extends BaseQualityGate {
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
     * Check image quality for resolution
     */
    async checkQuality(context) {
        const metadata = context.mediaMetadata;
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        
        // Minimum resolution thresholds
        const MIN_RESOLUTION = 480;
        const GOOD_RESOLUTION = 720;
        const EXCELLENT_RESOLUTION = 1080;
        
        // Calculate total megapixels
        const megapixels = (width * height) / 1000000;
        
        // Calculate resolution score
        const score = this.calculateResolutionScore(width, height);
        
        // Check for blocking issues
        if (width < MIN_RESOLUTION || height < MIN_RESOLUTION) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.LOW_RESOLUTION,
                `Image resolution is too low (${width}x${height}). Minimum required: ${MIN_RESOLUTION}x${MIN_RESOLUTION}.`,
                `Resolution: ${width}x${height}, Megapixels: ${megapixels.toFixed(2)}`,
                true,
                score,
                { width, height, megapixels, issue: 'too_low' }
            );
        }
        
        // Check for warning conditions
        if (width < GOOD_RESOLUTION || height < GOOD_RESOLUTION) {
            return this.createWarningResult(
                `Image resolution is acceptable but could be better (${width}x${height}). Higher resolution may improve accuracy.`,
                score,
                { width, height, megapixels, issue: 'acceptable' }
            );
        }
        
        return this.createPassResult(
            score,
            { width, height, megapixels, issue: 'good' }
        );
    }

    /**
     * Calculate resolution score
     * @param {number} width - Image width in pixels
     * @param {number} height - Image height in pixels
     * @returns {number} Score (0-100)
     */
    calculateResolutionScore(width, height) {
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        
        // Score based on minimum dimension (most important for analysis)
        let minScore = 0;
        if (minDimension >= 1080) {
            minScore = 100;
        } else if (minDimension >= 720) {
            minScore = 80 + this.normalizeTo100(minDimension, 720, 1080) * 0.2;
        } else if (minDimension >= 480) {
            minScore = 60 + this.normalizeTo100(minDimension, 480, 720) * 0.2;
        } else {
            minScore = this.normalizeTo100(minDimension, 0, 480) * 0.6;
        }
        
        // Bonus points for higher maximum dimension
        let maxBonus = 0;
        if (maxDimension >= 1920) {
            maxBonus = 10;
        } else if (maxDimension >= 1440) {
            maxBonus = 7;
        } else if (maxDimension >= 1080) {
            maxBonus = 5;
        } else if (maxDimension >= 720) {
            maxBonus = 3;
        }
        
        // Aspect ratio bonus (prefer standard ratios)
        const aspectRatio = maxDimension / minDimension;
        let aspectBonus = 0;
        
        if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
            aspectBonus = 5; // Square
        } else if (aspectRatio >= 1.3 && aspectRatio <= 1.4) {
            aspectBonus = 5; // 4:3
        } else if (aspectRatio >= 1.7 && aspectRatio <= 1.8) {
            aspectBonus = 5; // 16:9
        }
        
        return Math.min(100, minScore + maxBonus + aspectBonus);
    }

    /**
     * Get resolution quality description
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {string} Quality description
     */
    getResolutionDescription(width, height) {
        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);
        
        if (minDimension < 480) return 'Very low resolution';
        if (minDimension < 720) return 'Low resolution';
        if (minDimension < 1080) return 'Standard resolution';
        if (minDimension < 1440) return 'High resolution';
        if (minDimension < 2160) return 'Very high resolution';
        return 'Ultra high resolution';
    }

    /**
     * Get megapixel category
     * @param {number} megapixels - Image megapixels
     * @returns {string} Category description
     */
    getMegapixelCategory(megapixels) {
        if (megapixels < 0.3) return 'Sub-megapixel';
        if (megapixels < 1) return 'VGA range';
        if (megapixels < 2) return 'HD range';
        if (megapixels < 4) return 'Full HD range';
        if (megapixels < 8) return '2K range';
        if (megapixels < 12) return '4K range';
        return 'Ultra HD range';
    }

    /**
     * Get recommendations for improving resolution
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {string[]} Recommendations
     */
    getResolutionRecommendations(width, height) {
        const recommendations = [];
        const minDimension = Math.min(width, height);
        
        if (minDimension < 480) {
            recommendations.push('Use a device with a better camera');
            recommendations.push('Ensure camera is set to highest resolution');
            recommendations.push('Move closer to the subject if possible');
        } else if (minDimension < 720) {
            recommendations.push('Check camera settings for higher resolution');
            recommendations.push('Ensure digital zoom is not being used');
        } else if (minDimension < 1080) {
            recommendations.push('Use HD or higher camera settings');
            recommendations.push('Avoid excessive cropping after capture');
        }
        
        // General recommendations
        recommendations.push('Clean the camera lens for sharper images');
        recommendations.push('Ensure good focus before capturing');
        
        return recommendations;
    }

    /**
     * Check if resolution is suitable for specific analysis types
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Suitability assessment
     */
    checkAnalysisSuitability(width, height, analysisType) {
        const minDimension = Math.min(width, height);
        const megapixels = (width * height) / 1000000;
        
        const suitability = {
            conjunctiva: minDimension >= 720 && megapixels >= 1,
            wound: minDimension >= 480 && megapixels >= 0.5,
            general: minDimension >= 480 && megapixels >= 0.3
        };
        
        const recommendations = [];
        
        if (analysisType === 'conjunctiva' && !suitability.conjunctiva) {
            recommendations.push('Conjunctiva analysis requires at least 720p resolution');
            recommendations.push('Ensure camera is set to HD or higher quality');
        }
        
        if (analysisType === 'wound' && !suitability.wound) {
            recommendations.push('Wound analysis requires at least 480p resolution');
            recommendations.push('Use a device with a better camera for wound assessment');
        }
        
        return {
            suitable: suitability[analysisType] || suitability.general,
            recommendations,
            minRequired: this.getMinimumResolution(analysisType)
        };
    }

    /**
     * Get minimum resolution requirements for analysis type
     * @param {string} analysisType - Type of analysis
     * @returns {Object} Minimum requirements
     */
    getMinimumResolution(analysisType) {
        const requirements = {
            conjunctiva: { width: 720, height: 720, megapixels: 1 },
            wound: { width: 480, height: 480, megapixels: 0.5 },
            general: { width: 480, height: 480, megapixels: 0.3 }
        };
        
        return requirements[analysisType] || requirements.general;
    }

    /**
     * Get gate priority (resolution is important but less critical than focus/lighting)
     */
    getPriority() {
        return 70;
    }

    /**
     * Get execution cost (resolution check is very cheap)
     */
    getExecutionCost() {
        return 5;
    }
}

export default ResolutionGate;
