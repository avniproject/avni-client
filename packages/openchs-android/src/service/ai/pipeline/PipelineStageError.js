// @flow
import General from "../../../utility/General";

/**
 * PipelineStageError - Typed errors for different pipeline stages.
 * Provides structured error information with user-friendly messages and recovery guidance.
 */
class PipelineStageError extends Error {
    constructor(stage, errorCode, userMessage, technicalDetails = null, canRetry = true) {
        super(userMessage);
        this.name = 'PipelineStageError';
        
        // Error classification
        this.stage = stage;
        this.errorCode = errorCode;
        this.userMessage = userMessage;
        this.technicalDetails = technicalDetails;
        this.canRetry = canRetry;
        
        // Timestamp for debugging
        this.timestamp = new Date();
        
        // Maintain stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, PipelineStageError);
        }
    }

    /**
     * Create a media capture error
     */
    static mediaCaptureError(errorCode, userMessage, technicalDetails = null) {
        return new PipelineStageError(
            'MEDIA_CAPTURE',
            errorCode,
            userMessage,
            technicalDetails,
            true
        );
    }

    /**
     * Create a preprocessing error
     */
    static preprocessingError(errorCode, userMessage, technicalDetails = null) {
        return new PipelineStageError(
            'PREPROCESSING',
            errorCode,
            userMessage,
            technicalDetails,
            true
        );
    }

    /**
     * Create a quality gate error
     */
    static qualityGateError(errorCode, userMessage, technicalDetails = null, canRetry = true) {
        return new PipelineStageError(
            'QUALITY_GATES',
            errorCode,
            userMessage,
            technicalDetails,
            canRetry
        );
    }

    /**
     * Create a processing/inference error
     */
    static processingError(errorCode, userMessage, technicalDetails = null) {
        return new PipelineStageError(
            'PROCESSING',
            errorCode,
            userMessage,
            technicalDetails,
            true
        );
    }

    /**
     * Create a post-processing error
     */
    static postprocessingError(errorCode, userMessage, technicalDetails = null, canRetry = false) {
        return new PipelineStageError(
            'POSTPROCESSING',
            errorCode,
            userMessage,
            technicalDetails,
            canRetry
        );
    }

    /**
     * Create a fatal system error
     */
    static fatalError(technicalDetails) {
        return new PipelineStageError(
            'SYSTEM',
            'UNEXPECTED_ERROR',
            'An unexpected error occurred. Please try again.',
            technicalDetails,
            true
        );
    }

    /**
     * Get the action required for this error
     */
    getActionRequired() {
        const actionMap = {
            'MEDIA_CAPTURE': 'RETAKE',
            'PREPROCESSING': 'RETAKE',
            'QUALITY_GATES': 'RETAKE',
            'PROCESSING': 'RETRY',
            'POSTPROCESSING': 'CONTACT_SUPPORT',
            'SYSTEM': 'RETRY'
        };
        
        return actionMap[this.stage] || 'RETRY';
    }

    /**
     * Convert to a PipelineResult
     */
    toPipelineResult() {
        const PipelineResult = require('./PipelineResult').default;
        
        switch (this.stage) {
            case 'QUALITY_GATES':
                return PipelineResult.qualityFailure(
                    this.errorCode,
                    0, // Quality score will be set by the quality gate runner
                    null,
                    this.userMessage
                );
            
            case 'PROCESSING':
                return PipelineResult.inferenceError(this.userMessage, this.technicalDetails);
            
            case 'POSTPROCESSING':
                return PipelineResult.mappingError(this.userMessage, this.technicalDetails);
            
            default:
                return PipelineResult.error(
                    this.errorCode,
                    this.userMessage,
                    this.getActionRequired(),
                    this.technicalDetails
                );
        }
    }

    /**
     * Log the error with context
     */
    log() {
        General.logError('PipelineStageError', `${this.stage} [${this.errorCode}]: ${this.userMessage}`);
        if (this.technicalDetails) {
            General.logError('PipelineStageError', `Technical details: ${this.technicalDetails}`);
        }
    }

    /**
     * Get a user-friendly description
     */
    getUserDescription() {
        const descriptions = {
            'NO_IMAGE_DATA': 'No image was captured. Please try again.',
            'NO_AUDIO_DATA': 'No audio was recorded. Please try again.',
            'NOT_EYE': 'No eye detected in the image. Please position the camera correctly.',
            'EYE_CLOSED': 'Eye is closed. Please pull down the lower eyelid.',
            'EYE_TOO_FAR': 'Camera is too far. Please move closer.',
            'EYE_TOO_CLOSE': 'Camera is too close. Please move back.',
            'EYE_ANGLE_BAD': 'Camera angle is incorrect. Please hold phone directly in front.',
            'AMBIGUOUS_IMAGE': 'Image is unclear. Please ensure proper lighting and focus.',
            'BLURRY': 'Image is blurry. Please hold the camera steady.',
            'TOO_DARK': 'Image is too dark. Please improve lighting.',
            'TOO_BRIGHT': 'Image is too bright. Please reduce lighting or adjust angle.',
            'LOW_CONTRAST': 'Image has low contrast. Please adjust lighting.',
            'LOW_RESOLUTION': 'Image resolution is too low. Please use a better camera.',
            'INSUFFICIENT_CONJUNCTIVA_EXPOSED': 'Not enough conjunctiva visible. Please pull eyelid down more.',
            'UNEVEN_LIGHTING_ON_CONJUNCTIVA': 'Uneven lighting on conjunctiva. Please adjust for even lighting.',
            'TOO_MUCH_SILENCE': 'Recording has too much silence. Please speak clearly.',
            'AUDIO_CLIPPING': 'Audio is distorted. Please speak further from the microphone.',
            'OVERALL_QUALITY_TOO_LOW': 'Image quality is too low. Please retake with better conditions.',
            'INFERENCE_FAILED': 'Analysis failed. Please try again.',
            'OBSERVATION_MAPPING_FAILED': 'Could not save results. Please contact support.',
            'UNEXPECTED_ERROR': 'An unexpected error occurred. Please try again.'
        };
        
        return descriptions[this.errorCode] || this.userMessage;
    }
}

export default PipelineStageError;
