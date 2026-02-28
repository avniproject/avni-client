// @flow
import BasePreProcessor from '../BasePreProcessor';
import General from "../../../../../utility/General";

/**
 * ImagePreProcessor - Base preprocessor for all image types.
 * Provides common image processing functionality.
 */
class ImagePreProcessor extends BasePreProcessor {
    constructor() {
        super();
    }

    /**
     * Get quality gate names for image preprocessing
     */
    getQualityGateNames() {
        return ['BlurGate', 'BrightnessGate', 'ResolutionGate'];
    }

    /**
     * Validate image-specific requirements
     */
    async validateRawInput(context) {
        await super.validateRawInput(context);
        
        const { rawMedia } = context;
        
        // Additional image-specific validations
        if (!this.isImageType(rawMedia.mimeType)) {
            throw PipelineStageError.preprocessingError(
                'INVALID_MEDIA_TYPE',
                'Expected image media but received different type'
            );
        }

        // Check minimum file size (prevent empty/corrupt images)
        if (rawMedia.base64 && rawMedia.base64.length < 1000) {
            throw PipelineStageError.preprocessingError(
                'INVALID_IMAGE_SIZE',
                'Image appears to be too small or corrupt'
            );
        }

        General.logDebug('ImagePreProcessor', 'Image validation passed');
    }

    /**
     * Image-specific normalization
     */
    async normalizeImage(rawMedia) {
        try {
            // Use native ImageAnalysisModule for normalization
            const { ImageAnalysisModule } = require('../../../../../framework/NativeModules');
            
            const normalizedImage = await ImageAnalysisModule.normalize(rawMedia.base64, {
                autoRotate: true,
                colorSpace: 'RGB',
                fixOrientation: true
            });

            return {
                ...rawMedia,
                base64: normalizedImage.base64,
                width: normalizedImage.width,
                height: normalizedImage.height
            };
            
        } catch (error) {
            // Fallback to original if native module fails
            General.logWarn('ImagePreProcessor', `Native normalization failed: ${error.message}`);
            return rawMedia;
        }
    }

    /**
     * Extract image-specific metadata
     */
    async extractImageMetadata(imageMedia) {
        try {
            // Use native ImageAnalysisModule for metadata extraction
            const { ImageAnalysisModule } = require('../../../../../framework/NativeModules');
            
            const metadata = await ImageAnalysisModule.getMetadata(imageMedia.base64);
            
            return {
                width: metadata.width,
                height: metadata.height,
                brightnessStats: {
                    mean: metadata.brightnessMean,
                    std: metadata.brightnessStd,
                    min: metadata.brightnessMin,
                    max: metadata.brightnessMax
                },
                laplacianVariance: metadata.laplacianVariance,
                aspectRatio: metadata.width / metadata.height,
                fileSize: imageMedia.base64 ? imageMedia.base64.length : 0
            };
            
        } catch (error) {
            // Fallback to basic metadata if native module fails
            General.logWarn('ImagePreProcessor', `Metadata extraction failed: ${error.message}`);
            return await super.extractImageMetadata(imageMedia);
        }
    }

    /**
     * Resize image for quality gates (standard working resolution)
     */
    async resizeForQualityGates(imageMedia) {
        try {
            // Use native ImageAnalysisModule for resizing
            const { ImageAnalysisModule } = require('../../../../../framework/NativeModules');
            
            // Standard working resolution for quality analysis
            const workingResolution = {
                width: 1024,
                height: 1024,
                maintainAspectRatio: true
            };

            const resizedImage = await ImageAnalysisModule.resize(imageMedia.base64, workingResolution);

            return {
                ...imageMedia,
                base64: resizedImage.base64,
                width: resizedImage.width,
                height: resizedImage.height
            };
            
        } catch (error) {
            // Fallback to original if resizing fails
            General.logWarn('ImagePreProcessor', `Resizing failed: ${error.message}`);
            return imageMedia;
        }
    }

    /**
     * Check if image meets minimum resolution requirements
     */
    meetsMinimumResolution(metadata) {
        const minWidth = 480;
        const minHeight = 480;
        
        return metadata.width >= minWidth && metadata.height >= minHeight;
    }

    /**
     * Calculate image aspect ratio
     */
    calculateAspectRatio(metadata) {
        return metadata.width / metadata.height;
    }

    /**
     * Get image orientation from metadata
     */
    getOrientation(metadata) {
        const aspectRatio = this.calculateAspectRatio(metadata);
        
        if (aspectRatio > 1.2) return 'landscape';
        if (aspectRatio < 0.8) return 'portrait';
        return 'square';
    }
}

export default ImagePreProcessor;
