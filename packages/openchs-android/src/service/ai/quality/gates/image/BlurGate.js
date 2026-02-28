// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * BlurGate - Detects image blur using Laplacian variance.
 * Images with low Laplacian variance are considered blurry.
 */
class BlurGate extends BaseQualityGate {
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
     * Check image quality for blur
     */
    async checkQuality(context) {
        const metadata = context.mediaMetadata;
        if (!metadata || metadata.laplacianVariance == null) {
            return this.createWarningResult(
                '[Prototype] Blur check skipped - native module not available.',
                75,
                { issue: 'no_metadata_native_unavailable' }
            );
        }
        const laplacianVariance = metadata.laplacianVariance || 0;
        
        // Thresholds for blur detection
        const BLUR_THRESHOLD = 100;
        const SEVERE_BLUR_THRESHOLD = 50;
        
        // Calculate score based on Laplacian variance
        const score = this.calculateBlurScore(laplacianVariance);
        
        if (laplacianVariance < SEVERE_BLUR_THRESHOLD) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.BLURRY,
                'Image is too blurry. Please hold the camera steady and ensure good focus.',
                `Laplacian variance: ${laplacianVariance.toFixed(2)} (threshold: ${SEVERE_BLUR_THRESHOLD})`,
                true,
                score,
                { laplacianVariance, threshold: SEVERE_BLUR_THRESHOLD, severity: 'severe' }
            );
        }
        
        if (laplacianVariance < BLUR_THRESHOLD) {
            return this.createWarningResult(
                'Image appears slightly blurry. Results may be less accurate.',
                score,
                { laplacianVariance, threshold: BLUR_THRESHOLD, severity: 'moderate' }
            );
        }
        
        return this.createPassResult(
            score,
            { laplacianVariance, threshold: BLUR_THRESHOLD, severity: 'good' }
        );
    }

    /**
     * Calculate blur score from Laplacian variance
     * @param {number} laplacianVariance - Measured Laplacian variance
     * @returns {number} Score (0-100)
     */
    calculateBlurScore(laplacianVariance) {
        // Normalize Laplacian variance to 0-100 scale
        // Typical range: 0-2000, good images > 100, excellent > 500
        const maxVariance = 2000;
        const minVariance = 0;
        
        // Use logarithmic scaling for better sensitivity
        const logVariance = Math.log(Math.max(1, laplacianVariance));
        const logMax = Math.log(maxVariance);
        const logMin = Math.log(Math.max(1, minVariance));
        
        const score = ((logVariance - logMin) / (logMax - logMin)) * 100;
        return this.clamp(score, 0, 100);
    }

    /**
     * Get blur severity description
     * @param {number} laplacianVariance - Measured Laplacian variance
     * @returns {string} Severity description
     */
    getBlurSeverity(laplacianVariance) {
        if (laplacianVariance < 50) return 'severe';
        if (laplacianVariance < 100) return 'moderate';
        if (laplacianVariance < 300) return 'mild';
        return 'good';
    }

    /**
     * Get recommendations for improving blur
     * @param {number} laplacianVariance - Measured Laplacian variance
     * @returns {string[]} Recommendations
     */
    getBlurRecommendations(laplacianVariance) {
        const recommendations = [];
        
        if (laplacianVariance < 50) {
            recommendations.push('Hold the camera with both hands for stability');
            recommendations.push('Rest your elbows on a stable surface');
            recommendations.push('Ensure good lighting to reduce motion blur');
        } else if (laplacianVariance < 100) {
            recommendations.push('Hold the camera steadier');
            recommendations.push('Tap to focus before capturing');
        } else if (laplacianVariance < 300) {
            recommendations.push('Ensure the camera lens is clean');
            recommendations.push('Use slightly faster shutter speed if available');
        }
        
        return recommendations;
    }

    /**
     * Get gate priority (blur is very important for medical imaging)
     */
    getPriority() {
        return 90;
    }

    /**
     * Get execution cost (Laplacian variance is cheap to compute)
     */
    getExecutionCost() {
        return 20;
    }
}

export default BlurGate;
