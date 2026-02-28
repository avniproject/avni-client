// @flow
import PipelineStageError from '../pipeline/PipelineStageError';
import PipelineResult from '../pipeline/PipelineResult';
import QualityScore from './QualityScore';
import General from "../../../../utility/General";

/**
 * QualityGateRunner - Runs quality gate sets for specific preprocessor types.
 * Orchestrates multiple quality gates and calculates composite quality scores.
 */
class QualityGateRunner {
    constructor() {
        this.gateRegistry = new Map();
    }

    /**
     * Register a quality gate
     * @param {string} name - Gate name
     * @param {Class} GateClass - Gate class
     */
    registerGate(name, GateClass) {
        this.gateRegistry.set(name, GateClass);
        General.logDebug('QualityGateRunner', `Registered quality gate: ${name}`);
    }

    /**
     * Run quality gates for a preprocessor
     * @param {PipelineContext} context - Pipeline context
     * @param {string[]} gateNames - Names of gates to run
     * @returns {Promise<void>}
     */
    async runQualityGates(context, gateNames) {
        try {
            context.setStage('QUALITY_GATES');
            
            General.logDebug('QualityGateRunner', `Running ${gateNames.length} quality gates`);
            
            const gateResults = [];
            
            // Run each gate sequentially
            for (const gateName of gateNames) {
                const result = await this.runSingleGate(context, gateName);
                gateResults.push(result);
                
                // Add result to context
                context.addQualityGateResult(gateName, result);
                
                // If gate failed with blocking error, stop processing
                if (!result.passed && result.blocking) {
                    throw PipelineStageError.qualityGateError(
                        result.errorCode,
                        result.userMessage,
                        result.technicalDetails,
                        true
                    );
                }
            }
            
            // Calculate composite quality score
            const qualityScore = await this.calculateQualityScore(context, gateResults);
            context.qualityScore = qualityScore;
            
            // Check overall quality threshold
            await this.validateOverallQuality(context, qualityScore);
            
            General.logDebug('QualityGateRunner', `Quality gates completed with score: ${qualityScore.total}`);
            
        } catch (error) {
            if (error instanceof PipelineStageError) {
                throw error;
            }
            
            throw PipelineStageError.qualityGateError(
                'QUALITY_GATE_ERROR',
                'Quality assessment failed. Please try again.',
                error.message
            );
        }
    }

    /**
     * Run a single quality gate
     * @param {PipelineContext} context - Pipeline context
     * @param {string} gateName - Gate name
     * @returns {Promise<Object>} Gate result
     */
    async runSingleGate(context, gateName) {
        const GateClass = this.gateRegistry.get(gateName);
        
        if (!GateClass) {
            throw new Error(`Quality gate not registered: ${gateName}`);
        }
        
        const gate = new GateClass();
        
        try {
            const result = await gate.evaluate(context);
            
            return {
                gateName,
                passed: result.passed,
                blocking: result.blocking !== false,
                errorCode: result.errorCode || null,
                userMessage: result.userMessage || null,
                technicalDetails: result.technicalDetails || null,
                score: result.score || 0,
                metadata: result.metadata || {},
                timestamp: new Date()
            };
            
        } catch (error) {
            General.logError('QualityGateRunner', `Gate ${gateName} failed: ${error.message}`);
            
            return {
                gateName,
                passed: false,
                blocking: true,
                errorCode: 'GATE_EXECUTION_ERROR',
                userMessage: `Quality check ${gateName} failed. Please try again.`,
                technicalDetails: error.message,
                score: 0,
                metadata: {},
                timestamp: new Date()
            };
        }
    }

    /**
     * Calculate composite quality score from gate results
     * @param {PipelineContext} context - Pipeline context
     * @param {Object[]} gateResults - Array of gate results
     * @returns {Promise<QualityScore>} Composite quality score
     */
    async calculateQualityScore(context, gateResults) {
        const qualityScore = new QualityScore();
        
        // Extract relevant metadata from context
        const metadata = context.mediaMetadata || {};
        const aiConfig = context.aiConfig || {};
        const qualityConfig = aiConfig.qualityGates || {};
        
        // Calculate individual dimension scores
        const dimensionScores = {
            sharpness: this.calculateSharpnessScore(metadata),
            lighting: this.calculateLightingScore(metadata),
            roiCoverage: this.calculateROICoverageScore(context),
            colorUniformity: this.calculateColorUniformityScore(context),
            modelConfidence: this.calculateModelConfidenceScore(context)
        };
        
        // Apply weights for conjunctiva-specific scoring
        const weights = this.getQualityWeights(context);
        
        // Calculate weighted total
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [dimension, score] of Object.entries(dimensionScores)) {
            const weight = weights[dimension] || 0;
            totalScore += score * weight;
            totalWeight += weight;
            
            qualityScore.addDimension(dimension, score, weight);
        }
        
        // Normalize to 0-100 scale
        qualityScore.total = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
        
        // Determine quality tier
        qualityScore.tier = this.determineQualityTier(qualityScore.total);
        
        // Add breakdown information
        qualityScore.breakdown = {
            dimensions: dimensionScores,
            weights,
            gateResults: gateResults.map(r => ({
                name: r.gateName,
                passed: r.passed,
                score: r.score
            }))
        };
        
        return qualityScore;
    }

    /**
     * Calculate sharpness score from Laplacian variance
     */
    calculateSharpnessScore(metadata) {
        const laplacianVariance = metadata.laplacianVariance || 0;
        
        // Normalize Laplacian variance to 0-100 scale
        // Typical range: 0-1000, good images > 100
        const maxVariance = 1000;
        const minVariance = 50;
        
        if (laplacianVariance <= minVariance) return 0;
        if (laplacianVariance >= maxVariance) return 100;
        
        return ((laplacianVariance - minVariance) / (maxVariance - minVariance)) * 100;
    }

    /**
     * Calculate lighting score from brightness statistics
     */
    calculateLightingScore(metadata) {
        const brightnessStats = metadata.brightnessStats || {};
        const mean = brightnessStats.mean || 0;
        const std = brightnessStats.std || 0;
        
        let score = 100;
        
        // Penalize too dark or too bright
        if (mean < 40) score -= (40 - mean) * 2; // Too dark
        if (mean > 220) score -= (mean - 220) * 2; // Too bright
        
        // Penalize low contrast
        if (std < 15) score -= (15 - std) * 3; // Low contrast
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * Calculate ROI coverage score
     */
    calculateROICoverageScore(context) {
        // For conjunctiva, this would be based on segmentation model output
        const eyeDetection = context.mediaMetadata.eyeDetection;
        
        if (!eyeDetection) return 50; // Default score if no detection
        
        // Use confidence as a proxy for ROI coverage
        return eyeDetection.confidence * 100;
    }

    /**
     * Calculate color uniformity score
     */
    calculateColorUniformityScore(context) {
        // This would be based on segmentation model output for conjunctiva
        // For now, return a default score
        return 75;
    }

    /**
     * Calculate model confidence score
     */
    calculateModelConfidenceScore(context) {
        const eyeDetection = context.mediaMetadata.eyeDetection;
        
        if (!eyeDetection) return 0;
        
        return eyeDetection.confidence * 100;
    }

    /**
     * Get quality weights for the specific preprocessor type
     */
    getQualityWeights(context) {
        const preprocessorType = context.aiConfig.pipeline?.preProcessor;
        
        // Conjunctiva-specific weights
        if (preprocessorType === 'ConjunctivaPreProcessor') {
            return {
                sharpness: 0.25,
                lighting: 0.25,
                roiCoverage: 0.25,
                colorUniformity: 0.15,
                modelConfidence: 0.10
            };
        }
        
        // Default weights
        return {
            sharpness: 0.4,
            lighting: 0.4,
            roiCoverage: 0.2,
            colorUniformity: 0,
            modelConfidence: 0
        };
    }

    /**
     * Determine quality tier from score
     */
    determineQualityTier(score) {
        if (score >= 80) return 'HIGH';
        if (score >= 60) return 'MEDIUM';
        if (score >= 40) return 'LOW';
        return 'UNUSABLE';
    }

    /**
     * Validate overall quality against thresholds
     */
    async validateOverallQuality(context, qualityScore) {
        const aiConfig = context.aiConfig || {};
        const qualityConfig = aiConfig.qualityGates || {};
        const minScore = qualityConfig.minQualityScore || 40;
        const allowLowQuality = qualityConfig.allowLowQualityWithWarning || false;
        
        if (qualityScore.total < minScore) {
            const errorCode = 'OVERALL_QUALITY_TOO_LOW';
            const userMessage = `Image quality is too low (${Math.round(qualityScore.total)}/100). Please retake with better lighting and focus.`;
            
            if (!allowLowQuality) {
                throw PipelineStageError.qualityGateError(
                    errorCode,
                    userMessage,
                    `Quality score: ${qualityScore.total}, threshold: ${minScore}`,
                    true
                );
            } else {
                // Add as warning but don't block
                context.addQualityWarning(userMessage);
            }
        }
    }

    /**
     * Get registered gate names
     */
    getRegisteredGates() {
        return Array.from(this.gateRegistry.keys());
    }

    /**
     * Check if a gate is registered
     */
    hasGate(gateName) {
        return this.gateRegistry.has(gateName);
    }
}

export default QualityGateRunner;
