// @flow
import PipelineStageError from '../pipeline/PipelineStageError';
import General from "../../../utility/General";

/**
 * BaseProcessor - Abstract base class for all AI processors.
 * Provides common interface for running ML inference on preprocessed media.
 */
class BaseProcessor {
    constructor() {
        if (this.constructor === BaseProcessor) {
            throw new Error("BaseProcessor is abstract and cannot be instantiated directly");
        }
    }

    /**
     * Main processing entry point
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<void>}
     */
    async process(context) {
        try {
            context.setStage('PROCESSING');
            
            // Validate context has required data
            this.validateContext(context);
            
            // Prepare input for model
            const modelInput = await this.prepareModelInput(context);
            
            // Run inference
            const inferenceResult = await this.runInference(context, modelInput);
            
            // Store results in context
            context.rawInferenceOutput = inferenceResult.output;
            context.processorMetadata = {
                ...inferenceResult.metadata,
                processorName: this.getName(),
                processorVersion: this.getVersion(),
                timestamp: new Date()
            };
            
            General.logDebug('BaseProcessor', `Processing completed with ${this.getName()}`);
            
        } catch (error) {
            if (error instanceof PipelineStageError) {
                throw error;
            }
            
            throw PipelineStageError.processingError(
                'PROCESSING_FAILED',
                'AI processing failed. Please try again.',
                error.message
            );
        }
    }

    /**
     * Override this method in subclasses to implement specific inference
     * @param {PipelineContext} context - The pipeline context
     * @param {Object} modelInput - Prepared model input
     * @returns {Promise<Object>} Inference result
     */
    async runInference(context, modelInput) {
        throw new Error("runInference must be implemented by subclasses");
    }

    /**
     * Validate that context has required data for processing
     * @param {PipelineContext} context - The pipeline context
     */
    validateContext(context) {
        if (!context) {
            throw new Error("Pipeline context is required");
        }
        
        if (!context.extractedROI && !context.processedMedia) {
            throw new Error("Neither extracted ROI nor processed media is available for processing");
        }
        
        const aiConfig = context.aiConfig;
        if (!aiConfig || !aiConfig.pipeline || !aiConfig.pipeline.processorConfig) {
            throw new Error("Processor configuration is missing");
        }
    }

    /**
     * Prepare input for the ML model
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Object>} Prepared model input
     */
    async prepareModelInput(context) {
        const processorConfig = context.aiConfig.pipeline.processorConfig;
        const inputShape = processorConfig.inputShape;
        
        // Use extracted ROI if available, otherwise use processed media
        const sourceMedia = context.extractedROI || context.processedMedia;
        
        // Resize to exact model input shape
        const resizedInput = await this.resizeToModelInput(sourceMedia, inputShape);
        
        // Normalize pixel values if required
        const normalizedInput = await this.normalizeInput(resizedInput, processorConfig);
        
        return {
            data: normalizedInput,
            shape: inputShape,
            dataType: processorConfig.dataType || 'float32',
            metadata: {
                originalSize: { width: sourceMedia.width, height: sourceMedia.height },
                resizedSize: { width: inputShape[2], height: inputShape[1] },
                preprocessing: 'standard'
            }
        };
    }

    /**
     * Resize media to match model input shape
     * @param {Object} media - Source media
     * @param {Array<number>} inputShape - Model input shape [batch, height, width, channels]
     * @returns {Promise<Object>} Resized media
     */
    async resizeToModelInput(media, inputShape) {
        const [batch, height, width, channels] = inputShape;
        
        if (batch !== 1) {
            throw new Error(`Batch size must be 1, got ${batch}`);
        }
        
        try {
            const { ImageAnalysisModule } = require('../../../framework/NativeModules');
            
            const resizedImage = await ImageAnalysisModule.resize(media.base64, {
                width,
                height,
                maintainAspectRatio: false, // Force exact dimensions
                interpolation: 'bilinear'
            });
            
            return {
                ...media,
                base64: resizedImage.base64,
                width: resizedImage.width,
                height: resizedImage.height
            };
            
        } catch (error) {
            throw new Error(`Failed to resize image to model input: ${error.message}`);
        }
    }

    /**
     * Normalize input values for model
     * @param {Object} resizedInput - Resized input media
     * @param {Object} processorConfig - Processor configuration
     * @returns {Promise<Object>} Normalized input
     */
    async normalizeInput(resizedInput, processorConfig) {
        const normalization = processorConfig.normalization || 'standard';
        
        try {
            const { ImageAnalysisModule } = require('../../../framework/NativeModules');
            
            let normalizedData;
            
            switch (normalization) {
                case 'standard':
                    // Normalize to [0, 1] range
                    normalizedData = await ImageAnalysisModule.normalize(resizedInput.base64, {
                        range: [0, 1],
                        perChannel: true
                    });
                    break;
                    
                case 'imagenet':
                    // ImageNet normalization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                    normalizedData = await ImageAnalysisModule.normalize(resizedInput.base64, {
                        range: [0, 1],
                        mean: [0.485, 0.456, 0.406],
                        std: [0.229, 0.224, 0.225],
                        perChannel: true
                    });
                    break;
                    
                case 'centered':
                    // Normalize to [-1, 1] range
                    normalizedData = await ImageAnalysisModule.normalize(resizedInput.base64, {
                        range: [-1, 1],
                        perChannel: true
                    });
                    break;
                    
                default:
                    // No normalization
                    normalizedData = resizedInput.base64;
            }
            
            return normalizedData;
            
        } catch (error) {
            General.logWarn('BaseProcessor', `Normalization failed: ${error.message}`);
            return resizedInput.base64;
        }
    }

    /**
     * Get the name of this processor
     * @returns {string} Processor name
     */
    getName() {
        return this.constructor.name;
    }

    /**
     * Get the version of this processor
     * @returns {string} Processor version
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Get supported model types
     * @returns {string[]} Array of supported model types
     */
    getSupportedModelTypes() {
        return ['classification', 'regression', 'segmentation'];
    }

    /**
     * Check if this processor supports the given model type
     * @param {string} modelType - Model type
     * @returns {boolean}
     */
    supportsModelType(modelType) {
        return this.getSupportedModelTypes().includes(modelType);
    }

    /**
     * Validate processor configuration
     * @param {Object} processorConfig - Processor configuration
     * @returns {boolean} True if configuration is valid
     */
    validateProcessorConfig(processorConfig) {
        if (!processorConfig) {
            return false;
        }
        
        // Check required fields
        const requiredFields = ['modelFile', 'inputShape', 'outputType'];
        for (const field of requiredFields) {
            if (!processorConfig[field]) {
                General.logError('BaseProcessor', `Missing required field: ${field}`);
                return false;
            }
        }
        
        // Validate input shape
        if (!Array.isArray(processorConfig.inputShape) || processorConfig.inputShape.length !== 4) {
            General.logError('BaseProcessor', 'Input shape must be an array of 4 elements [batch, height, width, channels]');
            return false;
        }
        
        // Validate output type
        const validOutputTypes = ['classification', 'regression', 'segmentation'];
        if (!validOutputTypes.includes(processorConfig.outputType)) {
            General.logError('BaseProcessor', `Invalid output type: ${processorConfig.outputType}`);
            return false;
        }
        
        return true;
    }

    /**
     * Get model file path
     * @param {string} modelFile - Model file name
     * @returns {string} Full model file path
     */
    getModelFilePath(modelFile) {
        return `models/${modelFile}`;
    }

    /**
     * Estimate inference time based on model and input size
     * @param {Object} processorConfig - Processor configuration
     * @returns {number} Estimated inference time in milliseconds
     */
    estimateInferenceTime(processorConfig) {
        const inputShape = processorConfig.inputShape;
        const [batch, height, width, channels] = inputShape;
        const inputSize = height * width * channels;
        
        // Rough estimation based on input size
        const baseTime = 50; // Base time in ms
        const sizeFactor = inputSize / (224 * 224 * 3); // Relative to standard 224x224 RGB
        
        return Math.round(baseTime * sizeFactor);
    }

    /**
     * Check if this processor should run in the current context
     * @param {PipelineContext} context - Pipeline context
     * @returns {boolean}
     */
    shouldRun(context) {
        // Validate processor configuration
        const processorConfig = context.aiConfig.pipeline?.processorConfig;
        if (!this.validateProcessorConfig(processorConfig)) {
            return false;
        }
        
        // Check model type support
        if (!this.supportsModelType(processorConfig.outputType)) {
            return false;
        }
        
        return true;
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    getProcessingStats() {
        return {
            name: this.getName(),
            version: this.getVersion(),
            supportedModelTypes: this.getSupportedModelTypes(),
            supportedMediaTypes: this.getSupportedMediaTypes()
        };
    }

    /**
     * Get supported media types
     * @returns {string[]} Array of supported MIME types
     */
    getSupportedMediaTypes() {
        return ['image/jpeg', 'image/png', 'image/webp'];
    }
}

export default BaseProcessor;
