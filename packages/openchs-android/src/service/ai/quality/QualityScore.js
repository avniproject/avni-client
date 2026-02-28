// @flow
import General from "../../../../utility/General";

/**
 * QualityScore - Weighted composite scorer for media quality assessment.
 * Provides detailed breakdown of quality dimensions and tier classification.
 */
class QualityScore {
    constructor() {
        this.total = 0;
        this.tier = 'UNUSABLE';
        this.dimensions = new Map();
        this.weights = new Map();
        this.breakdown = null;
        this.timestamp = new Date();
    }

    /**
     * Add a dimension score with weight
     * @param {string} dimension - Dimension name
     * @param {number} score - Score (0-100)
     * @param {number} weight - Weight (0-1)
     */
    addDimension(dimension, score, weight) {
        this.dimensions.set(dimension, score);
        this.weights.set(dimension, weight);
        
        General.logDebug('QualityScore', `Added dimension ${dimension}: score=${score}, weight=${weight}`);
    }

    /**
     * Get score for a specific dimension
     * @param {string} dimension - Dimension name
     * @returns {number} Score (0-100)
     */
    getDimensionScore(dimension) {
        return this.dimensions.get(dimension) || 0;
    }

    /**
     * Get weight for a specific dimension
     * @param {string} dimension - Dimension name
     * @returns {number} Weight (0-1)
     */
    getDimensionWeight(dimension) {
        return this.weights.get(dimension) || 0;
    }

    /**
     * Get all dimension scores
     * @returns {Object} Dimension scores object
     */
    getAllDimensionScores() {
        const scores = {};
        for (const [dimension, score] of this.dimensions) {
            scores[dimension] = score;
        }
        return scores;
    }

    /**
     * Get all dimension weights
     * @returns {Object} Dimension weights object
     */
    getAllDimensionWeights() {
        const weights = {};
        for (const [dimension, weight] of this.weights) {
            weights[dimension] = weight;
        }
        return weights;
    }

    /**
     * Check if quality meets minimum threshold
     * @param {number} threshold - Minimum threshold (0-100)
     * @returns {boolean}
     */
    meetsThreshold(threshold) {
        return this.total >= threshold;
    }

    /**
     * Check if quality is high enough for clinical use
     * @returns {boolean}
     */
    isClinicallyUsable() {
        return this.tier === 'HIGH' || this.tier === 'MEDIUM';
    }

    /**
     * Check if quality is acceptable with warning
     * @returns {boolean}
     */
    isAcceptableWithWarning() {
        return this.tier === 'LOW';
    }

    /**
     * Check if quality is unusable
     * @returns {boolean}
     */
    isUnusable() {
        return this.tier === 'UNUSABLE';
    }

    /**
     * Get user-friendly quality description
     * @returns {string}
     */
    getQualityDescription() {
        const descriptions = {
            'HIGH': 'Excellent quality - suitable for clinical analysis',
            'MEDIUM': 'Good quality - suitable for screening with minor limitations',
            'LOW': 'Fair quality - results may be less accurate, consider retaking',
            'UNUSABLE': 'Poor quality - not suitable for analysis, please retake'
        };
        
        return descriptions[this.tier] || 'Unknown quality';
    }

    /**
     * Get quality tier color for UI display
     * @returns {string} Color code
     */
    getQualityColor() {
        const colors = {
            'HIGH': '#4CAF50',      // Green
            'MEDIUM': '#FF9800',    // Orange  
            'LOW': '#FF5722',       // Deep Orange
            'UNUSABLE': '#F44336'   // Red
        };
        
        return colors[this.tier] || '#9E9E9E'; // Gray for unknown
    }

    /**
     * Get quality recommendations based on score
     * @returns {string[]} Array of recommendations
     */
    getRecommendations() {
        const recommendations = [];
        const scores = this.getAllDimensionScores();
        
        // Sharpness recommendations
        if (scores.sharpness < 60) {
            recommendations.push('Hold the camera steady to reduce blur');
        }
        
        // Lighting recommendations
        if (scores.lighting < 60) {
            if (scores.lighting < 30) {
                recommendations.push('Improve lighting - image is too dark');
            } else {
                recommendations.push('Adjust lighting for better contrast');
            }
        }
        
        // ROI coverage recommendations
        if (scores.roiCoverage < 60) {
            recommendations.push('Position the camera to better capture the target area');
        }
        
        // Color uniformity recommendations
        if (scores.colorUniformity < 60) {
            recommendations.push('Ensure even lighting to reduce shadows');
        }
        
        // Model confidence recommendations
        if (scores.modelConfidence < 60) {
            recommendations.push('Ensure the target is clearly visible and well-positioned');
        }
        
        return recommendations;
    }

    /**
     * Get primary quality issue (lowest scoring dimension)
     * @returns {Object} Primary issue info
     */
    getPrimaryIssue() {
        let lowestScore = 100;
        let primaryDimension = null;
        
        for (const [dimension, score] of this.dimensions) {
            if (score < lowestScore) {
                lowestScore = score;
                primaryDimension = dimension;
            }
        }
        
        if (!primaryDimension) {
            return null;
        }
        
        const issueDescriptions = {
            'sharpness': 'Image appears blurry or out of focus',
            'lighting': 'Lighting conditions are suboptimal',
            'roiCoverage': 'Target area is not well captured',
            'colorUniformity': 'Lighting is uneven across the image',
            'modelConfidence': 'AI model confidence is low'
        };
        
        return {
            dimension: primaryDimension,
            score: lowestScore,
            description: issueDescriptions[primaryDimension] || 'Unknown quality issue',
            recommendations: this.getRecommendationsForDimension(primaryDimension)
        };
    }

    /**
     * Get recommendations for a specific dimension
     * @param {string} dimension - Dimension name
     * @returns {string[]} Recommendations
     */
    getRecommendationsForDimension(dimension) {
        const dimensionRecommendations = {
            'sharpness': [
                'Hold the camera steady with both hands',
                'Ensure good lighting to reduce motion blur',
                'Clean the camera lens if needed'
            ],
            'lighting': [
                'Move to a location with better lighting',
                'Avoid direct overhead lighting that creates shadows',
                'Use indirect light for more even illumination'
            ],
            'roiCoverage': [
                'Move closer to or further from the target',
                'Center the target in the frame',
                'Ensure the entire target area is visible'
            ],
            'colorUniformity': [
                'Adjust position to reduce shadows',
                'Use more diffuse lighting sources',
                'Avoid bright spots behind the target'
            ],
            'modelConfidence': [
                'Ensure the target is clearly visible',
                'Check that the target matches expected appearance',
                'Try different angles or positions'
            ]
        };
        
        return dimensionRecommendations[dimension] || ['Try improving overall image quality'];
    }

    /**
     * Create a summary object for logging/auditing
     * @returns {Object} Summary object
     */
    createSummary() {
        return {
            total: Math.round(this.total),
            tier: this.tier,
            dimensions: this.getAllDimensionScores(),
            weights: this.getAllDimensionWeights(),
            primaryIssue: this.getPrimaryIssue(),
            recommendations: this.getRecommendations(),
            timestamp: this.timestamp
        };
    }

    /**
     * Merge with another quality score (for averaging multiple assessments)
     * @param {QualityScore} other - Other quality score
     * @returns {QualityScore} Merged quality score
     */
    merge(other) {
        const merged = new QualityScore();
        
        // Average the total scores
        merged.total = (this.total + other.total) / 2;
        
        // Keep the lower (more conservative) tier
        const tierOrder = ['UNUSABLE', 'LOW', 'MEDIUM', 'HIGH'];
        const thisTierIndex = tierOrder.indexOf(this.tier);
        const otherTierIndex = tierOrder.indexOf(other.tier);
        merged.tier = tierOrder[Math.min(thisTierIndex, otherTierIndex)];
        
        // Average dimension scores
        for (const dimension of this.dimensions.keys()) {
            const thisScore = this.getDimensionScore(dimension);
            const otherScore = other.getDimensionScore(dimension);
            const thisWeight = this.getDimensionWeight(dimension);
            const otherWeight = other.getDimensionWeight(dimension);
            
            merged.addDimension(
                dimension,
                (thisScore + otherScore) / 2,
                (thisWeight + otherWeight) / 2
            );
        }
        
        return merged;
    }

    /**
     * Clone this quality score
     * @returns {QualityScore} Cloned quality score
     */
    clone() {
        const cloned = new QualityScore();
        cloned.total = this.total;
        cloned.tier = this.tier;
        cloned.breakdown = this.breakdown;
        
        for (const [dimension, score] of this.dimensions) {
            cloned.addDimension(dimension, score, this.getDimensionWeight(dimension));
        }
        
        return cloned;
    }
}

export default QualityScore;
