// @flow
import ImagePreProcessor from './ImagePreProcessor';
import PipelineStageError from '../../pipeline/PipelineStageError';
import General from "../../../../../utility/General";

/**
 * ConjunctivaPreProcessor - Specialized preprocessor for conjunctiva (eye) images.
 * Adds eye detection and ROI extraction for anemia screening.
 */
class ConjunctivaPreProcessor extends ImagePreProcessor {
    constructor() {
        super();
    }

    /**
     * Get quality gate names specific to conjunctiva processing
     */
    getQualityGateNames() {
        return [
            'BlurGate', 
            'BrightnessGate', 
            'ResolutionGate', 
            'EyeDetectionGate', 
            'ConjunctivaROIGate'
        ];
    }

    /**
     * Custom processing for conjunctiva images
     */
    async customProcessing(context) {
        await this.detectAndCropEyeRegion(context);
    }

    /**
     * Detect eye region and crop to ROI using eye detector model
     * @param {PipelineContext} context 
     */
    async detectAndCropEyeRegion(context) {
        try {
            const { processedMedia } = context;
            
            General.logDebug('ConjunctivaPreProcessor', 'Starting eye detection...');
            
            // Use TFLite processor with eye detector model
            const TFLiteProcessor = require('../../processors/TFLiteProcessor').default;
            const eyeDetector = new TFLiteProcessor();
            
            // Run eye detection
            const detectionResult = await eyeDetector.runModel(
                'eye_detector_v1.tflite',
                processedMedia.base64,
                {
                    inputShape: [1, 224, 224, 3],
                    outputType: 'classification'
                }
            );

            // Parse detection results
            const eyeInfo = this.parseEyeDetectionResult(detectionResult);
            
            // Validate eye detection
            if (!eyeInfo.isEyeDetected) {
                throw PipelineStageError.qualityGateError(
                    this.getEyeDetectionErrorCode(eyeInfo.label),
                    this.getEyeDetectionErrorMessage(eyeInfo.label),
                    `Eye detector confidence: ${eyeInfo.confidence}, label: ${eyeInfo.label}`
                );
            }

            // Extract eye bounding box if available
            if (eyeInfo.boundingBox) {
                context.extractedROI = await this.cropToEyeRegion(processedMedia, eyeInfo.boundingBox);
                General.logDebug('ConjunctivaPreProcessor', `Eye ROI extracted: ${JSON.stringify(eyeInfo.boundingBox)}`);
            } else {
                // If no bounding box, use the full processed image
                context.extractedROI = processedMedia;
                General.logDebug('ConjunctivaPreProcessor', 'Using full image as ROI (no bounding box detected)');
            }

            // Store eye detection metadata
            context.mediaMetadata.eyeDetection = {
                confidence: eyeInfo.confidence,
                label: eyeInfo.label,
                boundingBox: eyeInfo.boundingBox,
                eyeState: eyeInfo.eyeState
            };

        } catch (error) {
            if (error instanceof PipelineStageError) {
                throw error;
            }
            
            throw PipelineStageError.preprocessingError(
                'EYE_DETECTION_FAILED',
                'Failed to detect eye region. Please ensure the eye is clearly visible.',
                error.message
            );
        }
    }

    /**
     * Parse eye detection model output
     */
    parseEyeDetectionResult(detectionResult) {
        const output = detectionResult.output || {};
        
        return {
            isEyeDetected: this.isEyeDetected(output),
            confidence: output.confidence || 0,
            label: output.label || 'unknown',
            boundingBox: output.boundingBox || null,
            eyeState: this.determineEyeState(output.label)
        };
    }

    /**
     * Check if eye is detected based on model output
     */
    isEyeDetected(output) {
        const confidence = output.confidence || 0;
        const label = output.label || '';
        
        // Must have reasonable confidence and be an eye-related label
        return confidence >= 0.75 && 
               (label.includes('eye') || label.includes('conjunctiva') || label === 'eye_conjunctiva');
    }

    /**
     * Determine eye state from detection label
     */
    determineEyeState(label) {
        const stateMap = {
            'eye_conjunctiva': 'open',
            'eye_closed': 'closed',
            'eye_too_far': 'too_far',
            'eye_too_close': 'too_close',
            'eye_angle_bad': 'bad_angle',
            'not_eye': 'not_eye',
            'ambiguous': 'ambiguous'
        };
        
        return stateMap[label] || 'unknown';
    }

    /**
     * Get appropriate error code based on eye detection result
     */
    getEyeDetectionErrorCode(label) {
        const errorCodeMap = {
            'eye_closed': 'EYE_CLOSED',
            'eye_too_far': 'EYE_TOO_FAR',
            'eye_too_close': 'EYE_TOO_CLOSE',
            'eye_angle_bad': 'EYE_ANGLE_BAD',
            'not_eye': 'NOT_EYE',
            'ambiguous': 'AMBIGUOUS_IMAGE'
        };
        
        return errorCodeMap[label] || 'NOT_EYE';
    }

    /**
     * Get user-friendly error message for eye detection issues
     */
    getEyeDetectionErrorMessage(label) {
        const messageMap = {
            'eye_closed': 'Eyelid not pulled down. Please pull down lower eyelid.',
            'eye_too_far': 'Camera too far. Please move closer.',
            'eye_too_close': 'Camera too close. Please move back.',
            'eye_angle_bad': 'Camera angle incorrect. Please hold phone directly in front.',
            'not_eye': 'No eye detected. Please position camera correctly.',
            'ambiguous': 'Image unclear. Please ensure proper lighting and focus.'
        };
        
        return messageMap[label] || 'Eye detection failed. Please try again.';
    }

    /**
     * Crop image to eye region using bounding box
     */
    async cropToEyeRegion(imageMedia, boundingBox) {
        try {
            const { ImageAnalysisModule } = require('../../../../../framework/NativeModules');
            
            const croppedImage = await ImageAnalysisModule.crop(imageMedia.base64, boundingBox);
            
            return {
                ...imageMedia,
                base64: croppedImage.base64,
                width: croppedImage.width,
                height: croppedImage.height
            };
            
        } catch (error) {
            General.logWarn('ConjunctivaPreProcessor', `Eye region cropping failed: ${error.message}`);
            // Fallback to original image
            return imageMedia;
        }
    }

    /**
     * Validate conjunctiva-specific requirements
     */
    async validateRawInput(context) {
        await super.validateRawInput(context);
        
        // Additional validation for conjunctiva images
        const { rawMedia } = context;
        
        // Check if this is a suitable image format for eye detection
        const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
        if (!supportedFormats.includes(rawMedia.mimeType)) {
            throw PipelineStageError.preprocessingError(
                'UNSUPPORTED_IMAGE_FORMAT',
                `Image format ${rawMedia.mimeType} is not supported for conjunctiva analysis`
            );
        }

        General.logDebug('ConjunctivaPreProcessor', 'Conjunctiva validation passed');
    }
}

export default ConjunctivaPreProcessor;
