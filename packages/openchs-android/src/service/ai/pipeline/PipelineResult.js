// @flow
import _ from 'lodash';
import General from "../../../utility/General";

/**
 * PipelineResult - Typed result builder for AI pipeline operations.
 * Provides structured success/error states with actionable user guidance.
 */
class PipelineResult {
    constructor(status, data = {}) {
        this.status = status;
        this.timestamp = new Date();
        
        // Core result data
        this.result = data.result || null;
        this.observations = data.observations || [];
        this.warnings = data.warnings || [];
        
        // Error information
        this.errorCode = data.errorCode || null;
        this.technicalError = data.technicalError || null;
        this.userMessage = data.userMessage || null;
        
        // User guidance
        this.actionRequired = data.actionRequired || 'NONE';
        this.canRetry = data.canRetry !== false;
        
        // Quality information (for quality failures)
        this.qualityScore = data.qualityScore || null;
        this.gateBreakdown = data.gateBreakdown || null;
        
        // Audit information
        this.auditLog = data.auditLog || null;
    }

    // Static factory methods for different result types

    static success(result, observations = [], warnings = [], auditLog = null) {
        const qualityScore = result?.qualityScore;
        const status = qualityScore < 40 ? 'SUCCESS_LOW_QUALITY' : 
                      qualityScore < 60 ? 'SUCCESS_LOW_QUALITY' : 
                      'SUCCESS';
        
        const actionRequired = qualityScore < 40 ? 'RETAKE' : 
                              qualityScore < 60 ? 'CONSIDER_RETAKE' : 
                              'NONE';

        return new PipelineResult(status, {
            result,
            observations,
            warnings,
            actionRequired,
            auditLog
        });
    }

    static error(errorCode, userMessage, actionRequired = 'RETRY', technicalError = null) {
        return new PipelineResult('ERROR', {
            errorCode,
            userMessage,
            actionRequired,
            technicalError,
            canRetry: actionRequired !== 'CONTACT_SUPPORT'
        });
    }

    static qualityFailure(errorCode, qualityScore, gateBreakdown, userMessage) {
        return new PipelineResult('QUALITY_FAILURE', {
            errorCode,
            qualityScore,
            gateBreakdown,
            userMessage,
            actionRequired: 'RETAKE'
        });
    }

    static inferenceError(userMessage, technicalError = null) {
        return new PipelineResult('INFERENCE_ERROR', {
            errorCode: 'INFERENCE_FAILED',
            userMessage,
            technicalError,
            actionRequired: 'RETRY'
        });
    }

    static mappingError(userMessage, technicalError = null) {
        return new PipelineResult('MAPPING_ERROR', {
            errorCode: 'OBSERVATION_MAPPING_FAILED',
            userMessage,
            technicalError,
            actionRequired: 'CONTACT_SUPPORT',
            canRetry: false
        });
    }

    static fatalError(technicalError) {
        return new PipelineResult('FATAL_ERROR', {
            errorCode: 'UNEXPECTED_ERROR',
            userMessage: 'An unexpected error occurred. Please try again.',
            technicalError,
            actionRequired: 'RETRY'
        });
    }

    // Instance methods

    isSuccess() {
        return this.status === 'SUCCESS' || this.status === 'SUCCESS_LOW_QUALITY';
    }

    isError() {
        return this.status === 'ERROR' || 
               this.status === 'INFERENCE_ERROR' || 
               this.status === 'MAPPING_ERROR' || 
               this.status === 'FATAL_ERROR';
    }

    isQualityFailure() {
        return this.status === 'QUALITY_FAILURE';
    }

    canUserRetry() {
        return this.canRetry;
    }

    requiresUserAction() {
        return this.actionRequired !== 'NONE';
    }

    getQualityTier() {
        if (!this.result?.qualityScore) return null;
        
        const score = this.result.qualityScore;
        if (score >= 80) return 'HIGH';
        if (score >= 60) return 'MEDIUM';
        if (score >= 40) return 'LOW';
        return 'UNUSABLE';
    }

    // Error code constants
    static ErrorCodes = {
        // Media capture errors
        NO_IMAGE_DATA: 'NO_IMAGE_DATA',
        NO_AUDIO_DATA: 'NO_AUDIO_DATA',
        
        // Eye detection errors
        NOT_EYE: 'NOT_EYE',
        EYE_CLOSED: 'EYE_CLOSED',
        EYE_TOO_FAR: 'EYE_TOO_FAR',
        EYE_TOO_CLOSE: 'EYE_TOO_CLOSE',
        EYE_ANGLE_BAD: 'EYE_ANGLE_BAD',
        AMBIGUOUS_IMAGE: 'AMBIGUOUS_IMAGE',
        
        // Quality gate errors
        BLURRY: 'BLURRY',
        TOO_DARK: 'TOO_DARK',
        TOO_BRIGHT: 'TOO_BRIGHT',
        LOW_CONTRAST: 'LOW_CONTRAST',
        LOW_RESOLUTION: 'LOW_RESOLUTION',
        INSUFFICIENT_CONJUNCTIVA_EXPOSED: 'INSUFFICIENT_CONJUNCTIVA_EXPOSED',
        UNEVEN_LIGHTING_ON_CONJUNCTIVA: 'UNEVEN_LIGHTING_ON_CONJUNCTIVA',
        TOO_MUCH_SILENCE: 'TOO_MUCH_SILENCE',
        AUDIO_CLIPPING: 'AUDIO_CLIPPING',
        OVERALL_QUALITY_TOO_LOW: 'OVERALL_QUALITY_TOO_LOW',
        
        // Processing errors
        INFERENCE_FAILED: 'INFERENCE_FAILED',
        OBSERVATION_MAPPING_FAILED: 'OBSERVATION_MAPPING_FAILED',
        UNEXPECTED_ERROR: 'UNEXPECTED_ERROR'
    };

    // Action required constants
    static Actions = {
        NONE: 'NONE',
        RETRY: 'RETRY',
        RETAKE: 'RETAKE',
        RE_RECORD: 'RE_RECORD',
        CONSIDER_RETAKE: 'CONSIDER_RETAKE',
        CONTACT_SUPPORT: 'CONTACT_SUPPORT'
    };

    // Status constants
    static Status = {
        SUCCESS: 'SUCCESS',
        SUCCESS_LOW_QUALITY: 'SUCCESS_LOW_QUALITY',
        ERROR: 'ERROR',
        QUALITY_FAILURE: 'QUALITY_FAILURE',
        INFERENCE_ERROR: 'INFERENCE_ERROR',
        MAPPING_ERROR: 'MAPPING_ERROR',
        FATAL_ERROR: 'FATAL_ERROR'
    };
}

export default PipelineResult;
