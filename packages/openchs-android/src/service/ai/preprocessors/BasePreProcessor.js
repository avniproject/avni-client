// @flow
import PipelineStageError from '../pipeline/PipelineStageError';
import General from "../../../../utility/General";

/**
 * BasePreProcessor - Abstract base class for all media preprocessors.
 * Provides common validation, normalization, and metadata extraction functionality.
 */
class BasePreProcessor {
    constructor() {
        if (this.constructor === BasePreProcessor) {
            throw new Error("BasePreProcessor is abstract and cannot be instantiated directly");
        }
    }

    /**
     * Main preprocessing entry point
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<void>}
     */
    async process(context) {
        try {
            context.setStage('PREPROCESSING');
            
            // Execute preprocessing steps
            await this.validateRawInput(context);
            await this.normalizeMedia(context);
            await this.extractMetadata(context);
            await this.prepareForQualityGates(context);
            
            // Allow subclasses to add custom processing
            await this.customProcessing(context);
            
        } catch (error) {
            if (error instanceof PipelineStageError) {
                throw error;
            }
            
            // Wrap unexpected errors
            throw PipelineStageError.preprocessingError(
                'PREPROCESSING_FAILED',
                'Media preprocessing failed. Please try again.',
                error.message
            );
        }
    }

    /**
     * Validate that raw media input is present and not corrupt
     * @param {PipelineContext} context 
     */
    async validateRawInput(context) {
        if (!context.rawMedia) {
            throw PipelineStageError.preprocessingError(
                'NO_MEDIA_DATA',
                'No media data provided'
            );
        }

        const { uri, base64, mimeType } = context.rawMedia;
        
        if (!uri && !base64) {
            throw PipelineStageError.preprocessingError(
                'NO_MEDIA_DATA',
                'Media data is missing both URI and base64 content'
            );
        }

        if (!mimeType) {
            throw PipelineStageError.preprocessingError(
                'INVALID_MEDIA_TYPE',
                'Media type is not specified'
            );
        }

        // Validate media type is supported
        if (!this.isMediaTypeSupported(mimeType)) {
            throw PipelineStageError.preprocessingError(
                'UNSUPPORTED_MEDIA_TYPE',
                `Media type ${mimeType} is not supported`
            );
        }

        General.logDebug('BasePreProcessor', `Raw input validated: ${mimeType}`);
    }

    /**
     * Normalize media (decode, auto-rotate EXIF, convert color space)
     * @param {PipelineContext} context 
     */
    async normalizeMedia(context) {
        const { rawMedia } = context;
        
        try {
            // For image media, use native image analysis module
            if (this.isImageType(rawMedia.mimeType)) {
                context.processedMedia = await this.normalizeImage(rawMedia);
            } 
            // For audio media, use native audio analysis module
            else if (this.isAudioType(rawMedia.mimeType)) {
                context.processedMedia = await this.normalizeAudio(rawMedia);
            }
            
            General.logDebug('BasePreProcessor', 'Media normalized successfully');
            
        } catch (error) {
            throw PipelineStageError.preprocessingError(
                'NORMALIZATION_FAILED',
                'Failed to normalize media',
                error.message
            );
        }
    }

    /**
     * Extract metadata (width/height/duration, brightness stats, etc.)
     * @param {PipelineContext} context 
     */
    async extractMetadata(context) {
        try {
            const { processedMedia, rawMedia } = context;
            
            if (this.isImageType(rawMedia.mimeType)) {
                context.mediaMetadata = await this.extractImageMetadata(processedMedia);
            } else if (this.isAudioType(rawMedia.mimeType)) {
                context.mediaMetadata = await this.extractAudioMetadata(processedMedia);
            }
            
            General.logDebug('BasePreProcessor', `Metadata extracted: ${JSON.stringify(context.mediaMetadata)}`);
            
        } catch (error) {
            throw PipelineStageError.preprocessingError(
                'METADATA_EXTRACTION_FAILED',
                'Failed to extract media metadata',
                error.message
            );
        }
    }

    /**
     * Prepare media for quality gates (resize to working resolution)
     * @param {PipelineContext} context 
     */
    async prepareForQualityGates(context) {
        try {
            const { processedMedia, rawMedia } = context;
            
            if (this.isImageType(rawMedia.mimeType)) {
                // Resize to standard working resolution for quality analysis
                context.processedMedia = await this.resizeForQualityGates(processedMedia);
            }
            
            General.logDebug('BasePreProcessor', 'Media prepared for quality gates');
            
        } catch (error) {
            throw PipelineStageError.preprocessingError(
                'QUALITY_PREPARATION_FAILED',
                'Failed to prepare media for quality analysis',
                error.message
            );
        }
    }

    /**
     * Override this method in subclasses for custom preprocessing logic
     * @param {PipelineContext} context 
     */
    async customProcessing(context) {
        // Default implementation does nothing
        // Subclasses should override this for specific preprocessing steps
    }

    // Helper methods

    isMediaTypeSupported(mimeType) {
        return this.isImageType(mimeType) || this.isAudioType(mimeType);
    }

    isImageType(mimeType) {
        return mimeType.startsWith('image/');
    }

    isAudioType(mimeType) {
        return mimeType.startsWith('audio/');
    }

    async normalizeImage(rawMedia) {
        // This will be implemented using native ImageAnalysisModule
        // For now, return the raw media as-is
        return rawMedia;
    }

    async normalizeAudio(rawMedia) {
        // This will be implemented using native AudioAnalysisModule
        // For now, return the raw media as-is
        return rawMedia;
    }

    async extractImageMetadata(imageMedia) {
        // This will be implemented using native ImageAnalysisModule
        // For now, return basic metadata
        return {
            width: 0,
            height: 0,
            brightnessStats: { mean: 128, std: 50 },
            laplacianVariance: 100
        };
    }

    async extractAudioMetadata(audioMedia) {
        // This will be implemented using native AudioAnalysisModule
        // For now, return basic metadata
        return {
            duration: 0,
            rmsLevel: 0.5,
            peakLevel: 0.8,
            silenceRatio: 0.1,
            snr: 20
        };
    }

    async resizeForQualityGates(imageMedia) {
        // This will be implemented using native ImageAnalysisModule
        // For now, return the original media
        return imageMedia;
    }

    /**
     * Get the name of this preprocessor for registry lookup
     */
    getName() {
        return this.constructor.name;
    }

    /**
     * Get the quality gate names that should be run for this preprocessor
     */
    getQualityGateNames() {
        return ['BlurGate', 'BrightnessGate', 'ResolutionGate'];
    }
}

export default BasePreProcessor;
