// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * ConjunctivaROIGate - Validates conjunctiva region using segmentation model.
 * Ensures sufficient conjunctiva exposure and uniform lighting.
 */
class ConjunctivaROIGate extends BaseQualityGate {
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
     * Check if this gate should run (only for conjunctiva preprocessing)
     */
    shouldRun(context) {
        if (!super.shouldRun(context)) {
            return false;
        }
        
        // Only run for conjunctiva preprocessing
        const preprocessorType = context.aiConfig.pipeline?.preProcessor;
        return preprocessorType === 'ConjunctivaPreProcessor';
    }

    /**
     * Check conjunctiva ROI quality
     */
    async checkQuality(context) {
        const extractedROI = context.extractedROI;
        
        if (!extractedROI) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.INSUFFICIENT_CONJUNCTIVA_EXPOSED,
                'No eye region extracted for conjunctiva analysis.',
                'Extracted ROI not found in context',
                true,
                0,
                { issue: 'no_roi' }
            );
        }
        
        try {
            // Run conjunctiva segmentation model
            const segmentationResult = await this.runConjunctivaSegmentation(extractedROI);
            
            // Analyze segmentation results
            const analysis = this.analyzeSegmentationResult(segmentationResult);
            
            // Calculate quality score
            const score = this.calculateROIScore(analysis);
            
            // Check for blocking issues
            if (analysis.conjunctivaPixelRatio < 0.15) {
                return this.createFailResult(
                    PipelineResult.ErrorCodes.INSUFFICIENT_CONJUNCTIVA_EXPOSED,
                    'Not enough conjunctiva visible. Please pull eyelid down more to expose the conjunctiva.',
                    `Conjunctiva pixel ratio: ${(analysis.conjunctivaPixelRatio * 100).toFixed(1)}% (threshold: 15%)`,
                    true,
                    score,
                    { ...analysis, issue: 'insufficient_conjunctiva' }
                );
            }
            
            if (analysis.colorUniformity < 0.6) {
                return this.createFailResult(
                    PipelineResult.ErrorCodes.UNEVEN_LIGHTING_ON_CONJUNCTIVA,
                    'Uneven lighting on conjunctiva. Please adjust for more even lighting.',
                    `Color uniformity: ${(analysis.colorUniformity * 100).toFixed(1)}% (threshold: 60%)`,
                    true,
                    score,
                    { ...analysis, issue: 'uneven_lighting' }
                );
            }
            
            // Check for warning conditions
            if (analysis.meanRedness > 0.85) {
                return this.createWarningResult(
                    'Eye appears irritated. Results may be less accurate.',
                    score,
                    { ...analysis, issue: 'possible_irritation' }
                );
            }
            
            if (analysis.conjunctivaPixelRatio < 0.25) {
                return this.createWarningResult(
                    'Conjunctiva exposure could be better. Consider pulling eyelid down more.',
                    score,
                    { ...analysis, issue: 'limited_conjunctiva' }
                );
            }
            
            return this.createPassResult(
                score,
                { ...analysis, issue: 'good_roi' }
            );
            
        } catch (error) {
            return this.createFailResult(
                'SEGMENTATION_FAILED',
                'Failed to analyze conjunctiva region. Please try again.',
                error.message,
                true,
                0,
                { issue: 'segmentation_error', error: error.message }
            );
        }
    }

    /**
     * Run conjunctiva segmentation model
     * @param {Object} roiImage - Extracted eye region image
     * @returns {Promise<Object>} Segmentation result
     */
    async runConjunctivaSegmentation(roiImage) {
        try {
            // Use TFLite processor with conjunctiva segmentation model
            const TFLiteProcessor = require('../../../processors/TFLiteProcessor').default;
            const segmenter = new TFLiteProcessor();
            
            const result = await segmenter.runModel(
                'conjunctiva_segmentation_v1.tflite',
                roiImage.base64,
                {
                    inputShape: [1, 224, 224, 3],
                    outputType: 'segmentation'
                }
            );
            
            return result.output || {};
            
        } catch (error) {
            throw new Error(`Conjunctiva segmentation failed: ${error.message}`);
        }
    }

    /**
     * Analyze segmentation model output
     * @param {Object} segmentationResult - Raw segmentation output
     * @returns {Object} Analysis results
     */
    analyzeSegmentationResult(segmentationResult) {
        // Extract key metrics from segmentation
        const conjunctivaMask = segmentationResult.conjunctivaMask || [];
        const rednessMap = segmentationResult.rednessMap || [];
        const lightingMap = segmentationResult.lightingMap || [];
        
        // Calculate conjunctiva pixel ratio
        const totalPixels = conjunctivaMask.length;
        const conjunctivaPixels = conjunctivaMask.filter(pixel => pixel > 0.5).length;
        const conjunctivaPixelRatio = totalPixels > 0 ? conjunctivaPixels / totalPixels : 0;
        
        // Calculate mean redness
        const rednessValues = rednessMap.filter(value => value > 0);
        const meanRedness = rednessValues.length > 0 ? 
            rednessValues.reduce((sum, val) => sum + val, 0) / rednessValues.length : 0;
        
        // Calculate color uniformity (standard deviation of lighting)
        const lightingValues = lightingMap.filter(value => value > 0);
        const meanLighting = lightingValues.length > 0 ?
            lightingValues.reduce((sum, val) => sum + val, 0) / lightingValues.length : 0;
        const lightingVariance = lightingValues.length > 0 ?
            lightingValues.reduce((sum, val) => sum + Math.pow(val - meanLighting, 2), 0) / lightingValues.length : 0;
        const colorUniformity = Math.max(0, 1 - (Math.sqrt(lightingVariance) / meanLighting));
        
        // Calculate coverage quality (how well conjunctiva fills the ROI)
        const idealRatio = 0.4; // Ideal conjunctiva should be ~40% of eye ROI
        const coverageQuality = 1 - Math.abs(conjunctivaPixelRatio - idealRatio) / idealRatio;
        
        return {
            conjunctivaPixelRatio,
            meanRedness,
            colorUniformity,
            coverageQuality,
            totalPixels,
            conjunctivaPixels,
            meanLighting,
            lightingVariance
        };
    }

    /**
     * Calculate ROI quality score
     * @param {Object} analysis - Segmentation analysis
     * @returns {number} Quality score (0-100)
     */
    calculateROIScore(analysis) {
        let score = 0;
        
        // Conjunctiva coverage (40 points)
        const coverageScore = Math.min(40, analysis.conjunctivaPixelRatio * 100);
        score += coverageScore;
        
        // Color uniformity (30 points)
        const uniformityScore = analysis.colorUniformity * 30;
        score += uniformityScore;
        
        // Coverage quality (20 points)
        const qualityScore = analysis.coverageQuality * 20;
        score += qualityScore;
        
        // Redness penalty/bonus (10 points)
        let rednessScore = 10;
        if (analysis.meanRedness > 0.9) {
            rednessScore -= 5; // Penalty for very high redness
        } else if (analysis.meanRedness < 0.3) {
            rednessScore -= 3; // Penalty for very low redness (possible anemia)
        }
        score += Math.max(0, rednessScore);
        
        return Math.min(100, Math.max(0, score));
    }

    /**
     * Get conjunctiva exposure description
     * @param {number} ratio - Conjunctiva pixel ratio
     * @returns {string} Description
     */
    getConjunctivaExposureDescription(ratio) {
        if (ratio < 0.1) return 'Very poor exposure';
        if (ratio < 0.2) return 'Poor exposure';
        if (ratio < 0.3) return 'Limited exposure';
        if (ratio < 0.4) return 'Adequate exposure';
        if (ratio < 0.5) return 'Good exposure';
        return 'Excellent exposure';
    }

    /**
     * Get lighting uniformity description
     * @param {number} uniformity - Color uniformity score
     * @returns {string} Description
     */
    getLightingUniformityDescription(uniformity) {
        if (uniformity < 0.4) return 'Very uneven lighting';
        if (uniformity < 0.6) return 'Uneven lighting';
        if (uniformity < 0.8) return 'Fairly even lighting';
        return 'Very even lighting';
    }

    /**
     * Get redness level description
     * @param {number} redness - Mean redness value
     * @returns {string} Description
     */
    getRednessDescription(redness) {
        if (redness < 0.2) return 'Very pale';
        if (redness < 0.4) return 'Pale';
        if (redness < 0.6) return 'Normal pink';
        if (redness < 0.8) return 'Slightly red';
        if (redness < 0.9) return 'Red';
        return 'Very red';
    }

    /**
     * Get recommendations for improving conjunctiva ROI
     * @param {Object} analysis - Segmentation analysis
     * @returns {string[]} Recommendations
     */
    getROIRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.conjunctivaPixelRatio < 0.15) {
            recommendations.push('Pull lower eyelid down more to expose conjunctiva');
            recommendations.push('Ensure good lighting to see the conjunctiva clearly');
        } else if (analysis.conjunctivaPixelRatio < 0.25) {
            recommendations.push('Try to expose slightly more conjunctiva');
        }
        
        if (analysis.colorUniformity < 0.6) {
            recommendations.push('Adjust lighting for more even illumination');
            recommendations.push('Avoid shadows on the conjunctiva area');
            recommendations.push('Use diffuse lighting rather than direct light');
        }
        
        if (analysis.meanRedness > 0.85) {
            recommendations.push('Eye appears irritated - consider retaking if possible');
            recommendations.push('Avoid rubbing the eye before capture');
        }
        
        if (analysis.coverageQuality < 0.7) {
            recommendations.push('Center the conjunctiva better in the frame');
            recommendations.push('Ensure the entire conjunctiva area is visible');
        }
        
        return recommendations;
    }

    /**
     * Get gate priority (conjunctiva ROI is critical for anemia screening)
     */
    getPriority() {
        return 92;
    }

    /**
     * Get execution cost (segmentation model is moderately expensive)
     */
    getExecutionCost() {
        return 60;
    }
}

export default ConjunctivaROIGate;
