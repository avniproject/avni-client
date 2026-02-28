// @flow
import _ from 'lodash';
import General from "../../../../utility/General";

/**
 * PipelineContext - Shared mutable state passed through every stage of the AI pipeline.
 * Carries raw input, normalized media, quality results, inference output, and final observations.
 */
class PipelineContext {
    constructor(concept, aiConfig, rawMedia) {
        this.concept = concept;
        this.aiConfig = aiConfig;
        this.stage = 'INITIALIZED';
        this.startTime = new Date();
        
        // Media data
        this.rawMedia = rawMedia; // { uri, base64, mimeType }
        this.processedMedia = null; // normalized/resized media after pre-processing
        this.extractedROI = null; // cropped region of interest (e.g. eye, wound)
        
        // Metadata
        this.mediaMetadata = {}; // { width, height, duration, brightnessStats, laplacianVariance, ... }
        
        // Quality assessment
        this.qualityGateResults = []; // array of gate pass/fail records
        this.qualityScore = null; // composite QualityScore instance { total, tier, breakdown }
        this.qualityWarnings = []; // non-blocking issues collected during all stages
        
        // Inference
        this.rawInferenceOutput = null; // raw model output tensor / object
        this.processorMetadata = {}; // { modelVersion, inferenceMs, inputShape }
        
        // Results
        this.mappedValues = {}; // { hbEstimate: 9.2, anemiaRisk: 'high', ... }
        this.observations = []; // final Observation[] ready to push into the form
        
        // Error tracking
        this.error = null;
        this.errorStage = null;
    }

    /**
     * Update the current stage for error attribution and progress tracking
     */
    setStage(stage) {
        this.stage = stage;
        General.logDebug('PipelineContext', `Stage: ${stage}`);
    }

    /**
     * Add a quality gate result
     */
    addQualityGateResult(gateName, result) {
        this.qualityGateResults.push({
            gateName,
            timestamp: new Date(),
            ...result
        });
    }

    /**
     * Add a non-blocking quality warning
     */
    addQualityWarning(warning) {
        this.qualityWarnings.push({
            message: warning,
            timestamp: new Date()
        });
    }

    /**
     * Set an error state
     */
    setError(error, stage = null) {
        this.error = error;
        this.errorStage = stage || this.stage;
        General.logError('PipelineContext', `Error in ${this.errorStage}: ${error.message || error}`);
    }

    /**
     * Check if pipeline has an error
     */
    hasError() {
        return !_.isNil(this.error);
    }

    /**
     * Get processing duration in milliseconds
     */
    getDuration() {
        return new Date() - this.startTime;
    }

    /**
     * Create audit log entry
     */
    createAuditLog() {
        return {
            conceptUuid: this.concept.uuid,
            timestamp: this.startTime,
            duration: this.getDuration(),
            qualityScore: this.qualityScore?.total,
            qualityTier: this.qualityScore?.tier,
            inferenceMs: this.processorMetadata.inferenceMs,
            modelVersion: this.processorMetadata.modelVersion,
            warnings: this.qualityWarnings.map(w => w.message),
            error: this.error?.message,
            stage: this.stage
        };
    }

    /**
     * Validate that required context fields are present for the current stage
     */
    validateForStage(stage) {
        const validations = {
            'PREPROCESSING': ['rawMedia'],
            'QUALITY_GATES': ['processedMedia', 'mediaMetadata'],
            'PROCESSING': ['processedMedia', 'qualityScore'],
            'POSTPROCESSING': ['rawInferenceOutput', 'processorMetadata'],
            'COMPLETED': ['observations']
        };

        const requiredFields = validations[stage];
        if (!requiredFields) return true;

        return requiredFields.every(field => {
            const value = _.get(this, field);
            return !_.isNil(value);
        });
    }
}

export default PipelineContext;
