// @flow
import General from "../../../../../utility/General";

/**
 * BaseQualityGate - Abstract base class for all quality gates.
 * Provides common interface and utility methods for quality assessment.
 */
class BaseQualityGate {
    constructor() {
        if (this.constructor === BaseQualityGate) {
            throw new Error("BaseQualityGate is abstract and cannot be instantiated directly");
        }
    }

    /**
     * Main evaluation entry point
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Object>} Evaluation result
     */
    async evaluate(context) {
        try {
            // Validate context has required data
            this.validateContext(context);
            
            // Perform the actual quality check
            const result = await this.checkQuality(context);
            
            // Ensure result has required fields
            return this.normalizeResult(result);
            
        } catch (error) {
            General.logError('BaseQualityGate', `Gate ${this.getName()} evaluation failed: ${error.message}`);
            
            return {
                passed: false,
                blocking: true,
                errorCode: 'GATE_EVALUATION_ERROR',
                userMessage: `Quality check ${this.getName()} failed. Please try again.`,
                technicalDetails: error.message,
                score: 0,
                metadata: {}
            };
        }
    }

    /**
     * Override this method in subclasses to implement specific quality checks
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Object>} Quality check result
     */
    async checkQuality(context) {
        throw new Error("checkQuality must be implemented by subclasses");
    }

    /**
     * Validate that context has required data for this gate
     * @param {PipelineContext} context - The pipeline context
     */
    validateContext(context) {
        if (!context) {
            throw new Error("Pipeline context is required");
        }
        
        if (!context.processedMedia) {
            throw new Error("Processed media is required for quality assessment");
        }
        
        if (!context.mediaMetadata) {
            throw new Error("Media metadata is required for quality assessment");
        }
    }

    /**
     * Normalize result to ensure required fields are present
     * @param {Object} result - Raw result from checkQuality
     * @returns {Object} Normalized result
     */
    normalizeResult(result) {
        return {
            passed: result.passed || false,
            blocking: result.blocking !== false,
            errorCode: result.errorCode || null,
            userMessage: result.userMessage || null,
            technicalDetails: result.technicalDetails || null,
            score: result.score || 0,
            metadata: result.metadata || {}
        };
    }

    /**
     * Get the name of this quality gate
     * @returns {string} Gate name
     */
    getName() {
        return this.constructor.name;
    }

    /**
     * Create a passing result
     * @param {number} score - Quality score (0-100)
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Passing result
     */
    createPassResult(score = 100, metadata = {}) {
        return {
            passed: true,
            blocking: false,
            errorCode: null,
            userMessage: null,
            technicalDetails: null,
            score,
            metadata
        };
    }

    /**
     * Create a failing result
     * @param {string} errorCode - Error code
     * @param {string} userMessage - User-friendly message
     * @param {string} technicalDetails - Technical details
     * @param {boolean} blocking - Whether this blocks processing
     * @param {number} score - Quality score (0-100)
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Failing result
     */
    createFailResult(errorCode, userMessage, technicalDetails = null, blocking = true, score = 0, metadata = {}) {
        return {
            passed: false,
            blocking,
            errorCode,
            userMessage,
            technicalDetails,
            score,
            metadata
        };
    }

    /**
     * Create a warning result (passes but with warning)
     * @param {string} userMessage - Warning message
     * @param {number} score - Quality score (0-100)
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Warning result
     */
    createWarningResult(userMessage, score = 75, metadata = {}) {
        return {
            passed: true,
            blocking: false,
            errorCode: null,
            userMessage,
            technicalDetails: null,
            score,
            metadata: { ...metadata, isWarning: true }
        };
    }

    /**
     * Helper method to clamp values to a range
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Helper method to normalize a value to 0-100 scale
     * @param {number} value - Value to normalize
     * @param {number} min - Minimum expected value
     * @param {number} max - Maximum expected value
     * @returns {number} Normalized value (0-100)
     */
    normalizeTo100(value, min, max) {
        if (max <= min) return 0;
        
        const normalized = ((value - min) / (max - min)) * 100;
        return this.clamp(normalized, 0, 100);
    }

    /**
     * Helper method to calculate score from threshold comparison
     * @param {number} value - Measured value
     * @param {number} threshold - Threshold value
     * @param {boolean} higherIsBetter - Whether higher values are better
     * @param {number} margin - Acceptable margin around threshold
     * @returns {number} Score (0-100)
     */
    calculateThresholdScore(value, threshold, higherIsBetter = true, margin = 0) {
        const effectiveThreshold = higherIsBetter ? 
            threshold - margin : 
            threshold + margin;
        
        if (higherIsBetter) {
            if (value >= effectiveThreshold) return 100;
            return this.normalizeTo100(value, 0, effectiveThreshold);
        } else {
            if (value <= effectiveThreshold) return 100;
            return this.normalizeTo100(effectiveThreshold * 2 - value, effectiveThreshold, effectiveThreshold * 2);
        }
    }

    /**
     * Check if media type is supported by this gate
     * @param {string} mimeType - Media MIME type
     * @returns {boolean}
     */
    isMediaTypeSupported(mimeType) {
        // Default implementation supports all media types
        // Subclasses should override for specific media type restrictions
        return true;
    }

    /**
     * Get the media types this gate supports
     * @returns {string[]} Array of supported MIME types
     */
    getSupportedMediaTypes() {
        return ['*/*']; // Default supports all types
    }

    /**
     * Get the priority of this gate (higher = more important)
     * @returns {number} Priority (0-100)
     */
    getPriority() {
        return 50; // Default priority
    }

    /**
     * Get the execution cost of this gate (higher = more expensive)
     * @returns {number} Cost (0-100)
     */
    getExecutionCost() {
        return 50; // Default cost
    }

    /**
     * Check if this gate should run in the current context
     * @param {PipelineContext} context - Pipeline context
     * @returns {boolean}
     */
    shouldRun(context) {
        // Check media type support
        const mimeType = context.rawMedia?.mimeType;
        if (!this.isMediaTypeSupported(mimeType)) {
            return false;
        }
        
        // Subclasses can override for additional context checks
        return true;
    }
}

export default BaseQualityGate;
