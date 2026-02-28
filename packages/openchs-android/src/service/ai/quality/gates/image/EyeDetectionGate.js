// @flow
import BaseQualityGate from '../BaseQualityGate';
import PipelineResult from '../../../pipeline/PipelineResult';

/**
 * EyeDetectionGate - Validates eye detection results from the preprocessor.
 * Ensures a valid eye was detected with sufficient confidence.
 */
class EyeDetectionGate extends BaseQualityGate {
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
     * Check eye detection quality
     */
    async checkQuality(context) {
        const eyeDetection = context.mediaMetadata.eyeDetection;
        
        if (!eyeDetection) {
            return this.createFailResult(
                PipelineResult.ErrorCodes.NOT_EYE,
                'No eye detected in the image. Please position the camera correctly.',
                'Eye detection metadata not found',
                true,
                0,
                { issue: 'no_detection' }
            );
        }
        
        const confidence = eyeDetection.confidence || 0;
        const label = eyeDetection.label || '';
        const eyeState = eyeDetection.eyeState || 'unknown';
        
        // Minimum confidence threshold
        const MIN_CONFIDENCE = 0.75;
        
        // Calculate score based on confidence
        const score = confidence * 100;
        
        // Check confidence threshold
        if (confidence < MIN_CONFIDENCE) {
            return this.createFailResult(
                this.getEyeDetectionErrorCode(eyeState, label),
                this.getEyeDetectionErrorMessage(eyeState, label),
                `Eye detection confidence: ${(confidence * 100).toFixed(1)}%, label: ${label}`,
                true,
                score,
                { confidence, label, eyeState, issue: 'low_confidence' }
            );
        }
        
        // Check for specific eye states that might need warnings
        if (eyeState === 'ambiguous') {
            return this.createWarningResult(
                'Eye detection is somewhat uncertain. Results may be less accurate.',
                score,
                { confidence, label, eyeState, issue: 'ambiguous' }
            );
        }
        
        // Check if confidence is good but not excellent
        if (confidence < 0.85) {
            return this.createWarningResult(
                'Eye detection confidence could be better. Consider retaking if possible.',
                score,
                { confidence, label, eyeState, issue: 'moderate_confidence' }
            );
        }
        
        return this.createPassResult(
            score,
            { confidence, label, eyeState, issue: 'good_detection' }
        );
    }

    /**
     * Get appropriate error code based on eye detection result
     */
    getEyeDetectionErrorCode(eyeState, label) {
        const errorCodeMap = {
            'eye_closed': PipelineResult.ErrorCodes.EYE_CLOSED,
            'eye_too_far': PipelineResult.ErrorCodes.EYE_TOO_FAR,
            'eye_too_close': PipelineResult.ErrorCodes.EYE_TOO_CLOSE,
            'eye_angle_bad': PipelineResult.ErrorCodes.EYE_ANGLE_BAD,
            'not_eye': PipelineResult.ErrorCodes.NOT_EYE,
            'ambiguous': PipelineResult.ErrorCodes.AMBIGUOUS_IMAGE
        };
        
        return errorCodeMap[eyeState] || PipelineResult.ErrorCodes.NOT_EYE;
    }

    /**
     * Get user-friendly error message for eye detection issues
     */
    getEyeDetectionErrorMessage(eyeState, label) {
        const messageMap = {
            'eye_closed': 'Eyelid not pulled down. Please pull down lower eyelid to expose conjunctiva.',
            'eye_too_far': 'Camera too far from eye. Please move closer.',
            'eye_too_close': 'Camera too close to eye. Please move back slightly.',
            'eye_angle_bad': 'Camera angle incorrect. Please hold phone directly in front of eye.',
            'not_eye': 'No eye detected. Please position camera to focus on the eye.',
            'ambiguous': 'Eye detection unclear. Please ensure the eye is clearly visible and well-lit.'
        };
        
        return messageMap[eyeState] || 'Eye detection failed. Please try again.';
    }

    /**
     * Get eye state description
     * @param {string} eyeState - Eye state from detection
     * @returns {string} Human-readable description
     */
    getEyeStateDescription(eyeState) {
        const descriptions = {
            'open': 'Eye open and visible',
            'closed': 'Eye closed',
            'too_far': 'Eye too far from camera',
            'too_close': 'Eye too close to camera',
            'bad_angle': 'Camera angle incorrect',
            'not_eye': 'No eye detected',
            'ambiguous': 'Eye detection uncertain',
            'unknown': 'Unknown eye state'
        };
        
        return descriptions[eyeState] || descriptions.unknown;
    }

    /**
     * Get confidence level description
     * @param {number} confidence - Confidence score (0-1)
     * @returns {string} Confidence description
     */
    getConfidenceDescription(confidence) {
        if (confidence >= 0.9) return 'Very high confidence';
        if (confidence >= 0.8) return 'High confidence';
        if (confidence >= 0.75) return 'Good confidence';
        if (confidence >= 0.6) return 'Moderate confidence';
        if (confidence >= 0.4) return 'Low confidence';
        return 'Very low confidence';
    }

    /**
     * Get recommendations for improving eye detection
     * @param {string} eyeState - Eye state from detection
     * @param {number} confidence - Confidence score
     * @returns {string[]} Recommendations
     */
    getEyeDetectionRecommendations(eyeState, confidence) {
        const recommendations = [];
        
        // State-specific recommendations
        switch (eyeState) {
            case 'eye_closed':
                recommendations.push('Gently pull down the lower eyelid');
                recommendations.push('Ensure good lighting to see the conjunctiva');
                break;
                
            case 'eye_too_far':
                recommendations.push('Move camera closer to the eye');
                recommendations.push('Ensure eye fills most of the frame');
                break;
                
            case 'eye_too_close':
                recommendations.push('Move camera back slightly');
                recommendations.push('Ensure the entire eye is visible');
                break;
                
            case 'eye_angle_bad':
                recommendations.push('Hold phone directly in front of eye');
                recommendations.push('Avoid angled or side shots');
                break;
                
            case 'not_eye':
                recommendations.push('Position camera to focus on the eye');
                recommendations.push('Ensure the eye is clearly visible');
                recommendations.push('Remove any obstructions from view');
                break;
                
            case 'ambiguous':
                recommendations.push('Improve lighting conditions');
                recommendations.push('Ensure eye is in focus');
                recommendations.push('Hold camera steady');
                break;
        }
        
        // General recommendations based on confidence
        if (confidence < 0.8) {
            recommendations.push('Ensure good lighting on the eye');
            recommendations.push('Hold camera steady to reduce blur');
            recommendations.push('Clean the camera lens if needed');
        }
        
        return recommendations;
    }

    /**
     * Check if bounding box is appropriate for analysis
     * @param {Object} boundingBox - Eye bounding box
     * @param {Object} imageDimensions - Image dimensions
     * @returns {Object} Bounding box assessment
     */
    assessBoundingBox(boundingBox, imageDimensions) {
        if (!boundingBox || !imageDimensions) {
            return { valid: false, reason: 'Missing bounding box or image dimensions' };
        }
        
        const { x, y, width, height } = boundingBox;
        const { imageWidth, imageHeight } = imageDimensions;
        
        // Check if bounding box is within image bounds
        if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight) {
            return { valid: false, reason: 'Bounding box extends beyond image bounds' };
        }
        
        // Check if bounding box is reasonably sized
        const minSize = 50;
        const maxSize = Math.min(imageWidth, imageHeight) * 0.8;
        
        if (width < minSize || height < minSize) {
            return { valid: false, reason: 'Bounding box too small' };
        }
        
        if (width > maxSize || height > maxSize) {
            return { valid: false, reason: 'Bounding box too large' };
        }
        
        // Check aspect ratio (eye should be roughly horizontal)
        const aspectRatio = width / height;
        if (aspectRatio < 0.5 || aspectRatio > 3.0) {
            return { valid: false, reason: 'Bounding box aspect ratio unusual for eye' };
        }
        
        return { valid: true, reason: 'Bounding box looks appropriate' };
    }

    /**
     * Get gate priority (eye detection is critical for conjunctiva analysis)
     */
    getPriority() {
        return 95;
    }

    /**
     * Get execution cost (eye detection analysis is cheap)
     */
    getExecutionCost() {
        return 10;
    }
}

export default EyeDetectionGate;
