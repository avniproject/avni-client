// @flow
import BaseProcessor from './BaseProcessor';
import PipelineStageError from '../pipeline/PipelineStageError';
import General from "../../../utility/General";

/**
 * TFLiteProcessor - TensorFlow Lite processor for on-device ML inference.
 * Supports classification, regression, and segmentation models.
 */
class TFLiteProcessor extends BaseProcessor {
    constructor() {
        super();
    }

    /**
     * Get supported model types
     */
    getSupportedModelTypes() {
        return ['classification', 'regression', 'segmentation'];
    }

    /**
     * Get supported media types
     */
    getSupportedMediaTypes() {
        return ['image/jpeg', 'image/png', 'image/webp'];
    }

    /**
     * Run TensorFlow Lite inference
     */
    async runInference(context, modelInput) {
        const processorConfig = context.aiConfig.pipeline.processorConfig;
        const modelFile = processorConfig.modelFile;
        const outputType = processorConfig.outputType;
        
        try {
            General.logDebug('TFLiteProcessor', `Running inference with model: ${modelFile}`);
            
            const startTime = Date.now();
            
            // Call native TFLite module
            const { TFLiteInferenceModule } = require('../../../framework/NativeModules');
            
            const inferenceResult = await TFLiteInferenceModule.runModel(modelFile, modelInput.data, {
                inputShape: modelInput.shape,
                outputType: outputType,
                delegate: processorConfig.delegate || 'cpu', // cpu, gpu, nnapi
                numThreads: processorConfig.numThreads || 1,
                useXNNPACK: processorConfig.useXNNPACK !== false
            });
            
            const inferenceTime = Date.now() - startTime;
            
            // Parse and validate output
            const parsedOutput = this.parseInferenceOutput(inferenceResult, outputType, processorConfig);
            
            // Validate output format
            this.validateOutput(parsedOutput, outputType, processorConfig);
            
            return {
                output: parsedOutput,
                metadata: {
                    modelFile,
                    modelVersion: processorConfig.modelVersion || 'unknown',
                    inferenceMs: inferenceTime,
                    inputShape: modelInput.shape,
                    outputType,
                    delegate: processorConfig.delegate || 'cpu',
                    numThreads: processorConfig.numThreads || 1,
                    confidence: this.calculateConfidence(parsedOutput, outputType)
                }
            };
            
        } catch (error) {
            throw new Error(`TFLite inference failed: ${error.message}`);
        }
    }

    /**
     * Parse inference output based on model type
     * @param {Object} rawOutput - Raw output from TFLite module
     * @param {string} outputType - Type of output (classification, regression, segmentation)
     * @param {Object} processorConfig - Processor configuration
     * @returns {Object} Parsed output
     */
    parseInferenceOutput(rawOutput, outputType, processorConfig) {
        switch (outputType) {
            case 'classification':
                return this.parseClassificationOutput(rawOutput, processorConfig);
            case 'regression':
                return this.parseRegressionOutput(rawOutput, processorConfig);
            case 'segmentation':
                return this.parseSegmentationOutput(rawOutput, processorConfig);
            default:
                throw new Error(`Unsupported output type: ${outputType}`);
        }
    }

    /**
     * Parse classification output
     * @param {Object} rawOutput - Raw output
     * @param {Object} processorConfig - Processor configuration
     * @returns {Object} Parsed classification output
     */
    parseClassificationOutput(rawOutput, processorConfig) {
        const labels = processorConfig.labels || [];
        const probabilities = rawOutput.probabilities || [];
        const confidenceThreshold = processorConfig.confidenceThreshold || 0.5;
        
        if (!Array.isArray(probabilities) || probabilities.length === 0) {
            throw new Error('Invalid classification output: probabilities array is required');
        }
        
        if (labels.length > 0 && labels.length !== probabilities.length) {
            throw new Error(`Label count (${labels.length}) does not match probability count (${probabilities.length})`);
        }
        
        // Find the class with highest probability
        let maxProb = 0;
        let predictedIndex = 0;
        
        for (let i = 0; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
                maxProb = probabilities[i];
                predictedIndex = i;
            }
        }
        
        // Create class predictions
        const predictions = probabilities.map((prob, index) => ({
            label: labels[index] || `class_${index}`,
            probability: prob,
            index
        }));
        
        // Sort by probability (descending)
        predictions.sort((a, b) => b.probability - a.probability);
        
        return {
            type: 'classification',
            predictions,
            predictedClass: predictions[0].label,
            confidence: predictions[0].probability,
            meetsThreshold: predictions[0].probability >= confidenceThreshold,
            rawProbabilities: probabilities
        };
    }

    /**
     * Parse regression output
     * @param {Object} rawOutput - Raw output
     * @param {Object} processorConfig - Processor configuration
     * @returns {Object} Parsed regression output
     */
    parseRegressionOutput(rawOutput, processorConfig) {
        const outputNames = processorConfig.outputNames || ['value'];
        const values = rawOutput.values || [];
        
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error('Invalid regression output: values array is required');
        }
        
        if (outputNames.length > 0 && outputNames.length !== values.length) {
            throw new Error(`Output name count (${outputNames.length}) does not match value count (${values.length})`);
        }
        
        // Create value predictions
        const predictions = values.map((value, index) => ({
            name: outputNames[index] || `output_${index}`,
            value: value,
            index
        }));
        
        return {
            type: 'regression',
            predictions,
            primaryValue: predictions[0].value,
            allValues: values,
            rawOutput: rawOutput
        };
    }

    /**
     * Parse segmentation output
     * @param {Object} rawOutput - Raw output
     * @param {Object} processorConfig - Processor configuration
     * @returns {Object} Parsed segmentation output
     */
    parseSegmentationOutput(rawOutput, processorConfig) {
        const maskData = rawOutput.mask || [];
        const classMasks = rawOutput.classMasks || {};
        const labels = processorConfig.labels || [];
        
        if (!Array.isArray(maskData) || maskData.length === 0) {
            throw new Error('Invalid segmentation output: mask data is required');
        }
        
        // Calculate pixel statistics
        const totalPixels = maskData.length;
        const classCounts = {};
        
        // Count pixels per class
        for (let i = 0; i < maskData.length; i++) {
            const classId = maskData[i];
            classCounts[classId] = (classCounts[classId] || 0) + 1;
        }
        
        // Calculate class percentages
        const classPercentages = {};
        for (const [classId, count] of Object.entries(classCounts)) {
            classPercentages[classId] = count / totalPixels;
        }
        
        // Find dominant class
        let dominantClass = null;
        let maxPercentage = 0;
        
        for (const [classId, percentage] of Object.entries(classPercentages)) {
            if (percentage > maxPercentage) {
                maxPercentage = percentage;
                dominantClass = classId;
            }
        }
        
        return {
            type: 'segmentation',
            mask: maskData,
            classMasks: classMasks,
            classCounts,
            classPercentages,
            dominantClass,
            dominantPercentage: maxPercentage,
            totalPixels,
            labels
        };
    }

    /**
     * Validate parsed output
     * @param {Object} output - Parsed output
     * @param {string} outputType - Expected output type
     * @param {Object} processorConfig - Processor configuration
     */
    validateOutput(output, outputType, processorConfig) {
        if (!output || typeof output !== 'object') {
            throw new Error('Invalid output: must be an object');
        }
        
        if (output.type !== outputType) {
            throw new Error(`Output type mismatch: expected ${outputType}, got ${output.type}`);
        }
        
        switch (outputType) {
            case 'classification':
                if (!output.predictions || !Array.isArray(output.predictions)) {
                    throw new Error('Classification output must include predictions array');
                }
                break;
                
            case 'regression':
                if (!output.predictions || !Array.isArray(output.predictions)) {
                    throw new Error('Regression output must include predictions array');
                }
                if (typeof output.primaryValue !== 'number') {
                    throw new Error('Regression output must include primaryValue');
                }
                break;
                
            case 'segmentation':
                if (!output.mask || !Array.isArray(output.mask)) {
                    throw new Error('Segmentation output must include mask array');
                }
                if (typeof output.totalPixels !== 'number') {
                    throw new Error('Segmentation output must include totalPixels');
                }
                break;
        }
    }

    /**
     * Calculate confidence score for the output
     * @param {Object} output - Parsed output
     * @param {string} outputType - Output type
     * @returns {number} Confidence score (0-1)
     */
    calculateConfidence(output, outputType) {
        switch (outputType) {
            case 'classification':
                return output.confidence || 0;
                
            case 'regression':
                // For regression, use a simple heuristic based on value range
                const values = output.allValues || [];
                if (values.length === 0) return 0;
                
                const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
                const stdDev = Math.sqrt(variance);
                
                // Higher confidence for lower variance (more consistent predictions)
                return Math.max(0, 1 - (stdDev / Math.abs(mean || 1)));
                
            case 'segmentation':
                return output.dominantPercentage || 0;
                
            default:
                return 0;
        }
    }

    /**
     * Get model file information
     * @param {string} modelFile - Model file name
     * @returns {Promise<Object>} Model information
     */
    async getModelInfo(modelFile) {
        try {
            const { TFLiteInferenceModule } = require('../../../framework/NativeModules');
            
            const modelInfo = await TFLiteInferenceModule.getModelInfo(modelFile);
            
            return {
                fileName: modelFile,
                fileSize: modelInfo.fileSize,
                inputDetails: modelInfo.inputDetails,
                outputDetails: modelInfo.outputDetails,
                modelVersion: modelInfo.version || 'unknown'
            };
            
        } catch (error) {
            General.logWarn('TFLiteProcessor', `Failed to get model info for ${modelFile}: ${error.message}`);
            return {
                fileName: modelFile,
                error: error.message
            };
        }
    }

    /**
     * Check if model file exists and is accessible
     * @param {string} modelFile - Model file name
     * @returns {Promise<boolean>} True if model is accessible
     */
    async isModelAvailable(modelFile) {
        try {
            const { TFLiteInferenceModule } = require('../../../framework/NativeModules');
            return await TFLiteInferenceModule.isModelAvailable(modelFile);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get processor version
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Get processing capabilities
     */
    getCapabilities() {
        return {
            supportedDelegates: ['cpu', 'gpu', 'nnapi'],
            supportedOutputTypes: ['classification', 'regression', 'segmentation'],
            supportedInputFormats: ['image/jpeg', 'image/png', 'image/webp'],
            maxInputSize: 1024, // Maximum dimension
            minInputSize: 32,   // Minimum dimension
            supportsQuantization: true,
            supportsDynamicShapes: false
        };
    }

    /**
     * Estimate memory usage for inference
     * @param {Object} processorConfig - Processor configuration
     * @returns {Object} Memory usage estimate
     */
    estimateMemoryUsage(processorConfig) {
        const inputShape = processorConfig.inputShape;
        const [batch, height, width, channels] = inputShape;
        
        // Input memory (float32 = 4 bytes per element)
        const inputMemory = batch * height * width * channels * 4;
        
        // Estimate output memory (rough approximation)
        let outputMemory = 0;
        switch (processorConfig.outputType) {
            case 'classification':
                outputMemory = (processorConfig.labels?.length || 1000) * 4;
                break;
            case 'regression':
                outputMemory = (processorConfig.outputNames?.length || 1) * 4;
                break;
            case 'segmentation':
                outputMemory = height * width * 4; // One mask
                break;
        }
        
        // Model memory (rough estimate based on input size)
        const modelMemory = inputMemory * 2; // Rough approximation
        
        return {
            inputMemoryMB: inputMemory / (1024 * 1024),
            outputMemoryMB: outputMemory / (1024 * 1024),
            modelMemoryMB: modelMemory / (1024 * 1024),
            totalMemoryMB: (inputMemory + outputMemory + modelMemory) / (1024 * 1024)
        };
    }
}

export default TFLiteProcessor;
