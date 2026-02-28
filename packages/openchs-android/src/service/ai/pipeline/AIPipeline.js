// @flow
import PipelineContext from './PipelineContext';
import PipelineResult from './PipelineResult';
import PipelineStageError from './PipelineStageError';
import preProcessorRegistry from '../preprocessors/PreProcessorRegistry';
import processorRegistry from '../processors/ProcessorRegistry';
import postProcessorRegistry from '../postprocessors/PostProcessorRegistry';
import QualityGateRunner from '../quality/QualityGateRunner';
import General from "../../../../utility/General";
import ImagePreProcessor from '../preprocessors/image/ImagePreProcessor';
import ConjunctivaPreProcessor from '../preprocessors/image/ConjunctivaPreProcessor';
import WoundPreProcessor from '../preprocessors/image/WoundPreProcessor';
import AudioPreProcessor from '../preprocessors/audio/AudioPreProcessor';
import SpeechPreProcessor from '../preprocessors/audio/SpeechPreProcessor';
import TFLiteProcessor from '../processors/TFLiteProcessor';
import ONNXProcessor from '../processors/ONNXProcessor';
import RuleBasedProcessor from '../processors/RuleBasedProcessor';
import ObservationMapper from '../postprocessors/ObservationMapper';
import HbObservationMapper from '../postprocessors/HbObservationMapper';
import TranscriptionMapper from '../postprocessors/TranscriptionMapper';
import WoundSeverityMapper from '../postprocessors/WoundSeverityMapper';
import BlurGate from '../quality/gates/image/BlurGate';
import BrightnessGate from '../quality/gates/image/BrightnessGate';
import ResolutionGate from '../quality/gates/image/ResolutionGate';
import EyeDetectionGate from '../quality/gates/image/EyeDetectionGate';
import ConjunctivaROIGate from '../quality/gates/image/ConjunctivaROIGate';
import SilenceGate from '../quality/gates/audio/SilenceGate';
import ClippingGate from '../quality/gates/audio/ClippingGate';

/**
 * AIPipeline - Main orchestrator for the AI observation pipeline.
 * Coordinates preprocessing, quality gates, processing, and post-processing stages.
 */
class AIPipeline {
    constructor() {
        this.qualityGateRunner = new QualityGateRunner();
        this.initializeRegistries();
    }

    /**
     * Initialize all component registries
     */
    initializeRegistries() {
        // Register preprocessors
        preProcessorRegistry.register('ImagePreProcessor', ImagePreProcessor);
        preProcessorRegistry.register('ConjunctivaPreProcessor', ConjunctivaPreProcessor);
        preProcessorRegistry.register('WoundPreProcessor', WoundPreProcessor);
        preProcessorRegistry.register('AudioPreProcessor', AudioPreProcessor);
        preProcessorRegistry.register('SpeechPreProcessor', SpeechPreProcessor);
        
        // Register processors
        processorRegistry.register('TFLiteProcessor', TFLiteProcessor);
        processorRegistry.register('ONNXProcessor', ONNXProcessor);
        processorRegistry.register('RuleBasedProcessor', RuleBasedProcessor);
        
        // Register postprocessors
        postProcessorRegistry.register('ObservationMapper', ObservationMapper);
        postProcessorRegistry.register('HbObservationMapper', HbObservationMapper);
        postProcessorRegistry.register('TranscriptionMapper', TranscriptionMapper);
        postProcessorRegistry.register('WoundSeverityMapper', WoundSeverityMapper);
        
        // Register quality gates
        this.qualityGateRunner.registerGate('BlurGate', BlurGate);
        this.qualityGateRunner.registerGate('BrightnessGate', BrightnessGate);
        this.qualityGateRunner.registerGate('ResolutionGate', ResolutionGate);
        this.qualityGateRunner.registerGate('EyeDetectionGate', EyeDetectionGate);
        this.qualityGateRunner.registerGate('ConjunctivaROIGate', ConjunctivaROIGate);
        this.qualityGateRunner.registerGate('SilenceGate', SilenceGate);
        this.qualityGateRunner.registerGate('ClippingGate', ClippingGate);
        
        General.logDebug('AIPipeline', 'Component registries initialized');
    }

    /**
     * Run the complete AI pipeline
     * @param {Concept} concept - The concept with AI configuration
     * @param {Object} rawMedia - Raw media input
     * @returns {Promise<PipelineResult>} Pipeline result
     */
    async runPipeline(concept, rawMedia) {
        const startTime = new Date();
        
        try {
            // Validate inputs
            this.validateInputs(concept, rawMedia);
            
            // Extract AI configuration
            const aiConfig = this.extractAIConfig(concept);
            if (!aiConfig.enabled) {
                return PipelineResult.error(
                    'AI_DISABLED',
                    'AI observations are not enabled for this concept',
                    'NONE'
                );
            }
            
            // Create pipeline context
            const context = new PipelineContext(concept, aiConfig, rawMedia);
            
            // Run pipeline stages
            await this.runPreprocessing(context);
            await this.runQualityGates(context);
            await this.runProcessing(context);
            await this.runPostProcessing(context);
            
            // Create success result
            const result = this.createSuccessResult(context);
            
            General.logDebug('AIPipeline', `Pipeline completed successfully in ${context.getDuration()}ms`);
            
            return result;
            
        } catch (error) {
            General.logError('AIPipeline', `Pipeline failed: ${error.message}`);
            
            if (error instanceof PipelineStageError) {
                return error.toPipelineResult();
            }
            
            return PipelineResult.fatalError(error.message);
        } finally {
            const duration = new Date() - startTime;
            General.logDebug('AIPipeline', `Pipeline execution time: ${duration}ms`);
        }
    }

    /**
     * Validate pipeline inputs
     * @param {Concept} concept - The concept
     * @param {Object} rawMedia - Raw media
     */
    validateInputs(concept, rawMedia) {
        if (!concept) {
            throw new Error('Concept is required');
        }
        
        if (!rawMedia) {
            throw new Error('Raw media is required');
        }
        
        if (!rawMedia.uri && !rawMedia.base64) {
            throw new Error('Media must have either URI or base64 content');
        }
        
        if (!rawMedia.mimeType) {
            throw new Error('Media type is required');
        }
    }

    /**
     * Extract AI configuration from concept
     * @param {Concept} concept - The concept
     * @returns {Object} AI configuration
     */
    extractAIConfig(concept) {
        // Get aiConfig from concept (this would be stored in concept.additionalInfo or similar)
        const aiConfig = concept.additionalInfo?.aiConfig || {};
        
        // Set defaults
        return {
            enabled: aiConfig.enabled || false,
            mediaType: aiConfig.mediaType || 'image',
            captureConfig: aiConfig.captureConfig || {},
            pipeline: aiConfig.pipeline || {},
            outputMapping: aiConfig.outputMapping || [],
            qualityGates: aiConfig.qualityGates || {},
            qualityMetaConcepts: aiConfig.qualityMetaConcepts || {}
        };
    }

    /**
     * Run preprocessing stage
     * @param {PipelineContext} context - Pipeline context
     */
    async runPreprocessing(context) {
        const preprocessorName = context.aiConfig.pipeline.preProcessor;
        
        if (!preprocessorName) {
            throw new Error('PreProcessor not specified in AI configuration');
        }
        
        const preprocessor = preProcessorRegistry.get(preprocessorName);
        
        General.logDebug('AIPipeline', `Running preprocessing with ${preprocessorName}`);
        
        await preprocessor.process(context);
        
        // Validate preprocessing results
        if (!context.validateForStage('QUALITY_GATES')) {
            throw new Error('Preprocessing validation failed');
        }
    }

    /**
     * Run quality gates stage
     * @param {PipelineContext} context - Pipeline context
     */
    async runQualityGates(context) {
        const preprocessor = preProcessorRegistry.get(context.aiConfig.pipeline.preProcessor);
        const gateNames = preprocessor.getQualityGateNames();
        
        General.logDebug('AIPipeline', `Running ${gateNames.length} quality gates`);
        
        await this.qualityGateRunner.runQualityGates(context, gateNames);
        
        // Validate quality gates results
        if (!context.validateForStage('PROCESSING')) {
            throw new Error('Quality gates validation failed');
        }
    }

    /**
     * Run processing stage
     * @param {PipelineContext} context - Pipeline context
     */
    async runProcessing(context) {
        const processorName = context.aiConfig.pipeline.processor;
        
        if (!processorName) {
            throw new Error('Processor not specified in AI configuration');
        }
        
        const processor = processorRegistry.get(processorName);
        
        General.logDebug('AIPipeline', `Running processing with ${processorName}`);
        
        await processor.process(context);
        
        // Validate processing results
        if (!context.validateForStage('POSTPROCESSING')) {
            throw new Error('Processing validation failed');
        }
    }

    /**
     * Run post-processing stage
     * @param {PipelineContext} context - Pipeline context
     */
    async runPostProcessing(context) {
        const postprocessorName = context.aiConfig.pipeline.postProcessor;
        
        if (!postprocessorName) {
            throw new Error('PostProcessor not specified in AI configuration');
        }
        
        const postprocessor = postProcessorRegistry.get(postprocessorName);
        
        General.logDebug('AIPipeline', `Running post-processing with ${postprocessorName}`);
        
        await postprocessor.process(context);
        
        // Validate post-processing results
        if (!context.validateForStage('COMPLETED')) {
            throw new Error('Post-processing validation failed');
        }
    }

    /**
     * Create success result from context
     * @param {PipelineContext} context - Pipeline context
     * @returns {PipelineResult} Success result
     */
    createSuccessResult(context) {
        const result = {
            estimatedValues: context.mappedValues,
            confidence: context.processorMetadata.confidence,
            qualityScore: context.qualityScore.total,
            qualityTier: context.qualityScore.tier,
            processorInfo: {
                name: context.processorMetadata.processorName,
                version: context.processorMetadata.modelVersion,
                inferenceTime: context.processorMetadata.inferenceMs
            }
        };
        
        const warnings = context.qualityWarnings.map(w => w.message);
        const auditLog = context.createAuditLog();
        
        return PipelineResult.success(result, context.observations, warnings, auditLog);
    }

    /**
     * Check if AI is enabled for a concept
     * @param {Concept} concept - The concept to check
     * @returns {boolean} True if AI is enabled
     */
    isAIEnabled(concept) {
        try {
            const aiConfig = this.extractAIConfig(concept);
            return aiConfig.enabled;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get AI configuration for a concept
     * @param {Concept} concept - The concept
     * @returns {Object|null} AI configuration or null
     */
    getAIConfig(concept) {
        try {
            const aiConfig = this.extractAIConfig(concept);
            return aiConfig.enabled ? aiConfig : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Validate AI configuration
     * @param {Object} aiConfig - AI configuration
     * @returns {Object} Validation result
     */
    validateAIConfig(aiConfig) {
        const errors = [];
        const warnings = [];
        
        if (!aiConfig.enabled) {
            return { valid: true, errors: [], warnings: ['AI is disabled'] };
        }
        
        // Validate pipeline configuration
        if (!aiConfig.pipeline) {
            errors.push('Pipeline configuration is required');
        } else {
            if (!aiConfig.pipeline.preProcessor) {
                errors.push('PreProcessor is required');
            } else if (!preProcessorRegistry.has(aiConfig.pipeline.preProcessor)) {
                errors.push(`Unknown PreProcessor: ${aiConfig.pipeline.preProcessor}`);
            }
            
            if (!aiConfig.pipeline.processor) {
                errors.push('Processor is required');
            } else if (!processorRegistry.has(aiConfig.pipeline.processor)) {
                errors.push(`Unknown Processor: ${aiConfig.pipeline.processor}`);
            }
            
            if (!aiConfig.pipeline.postProcessor) {
                errors.push('PostProcessor is required');
            } else if (!postProcessorRegistry.has(aiConfig.pipeline.postProcessor)) {
                errors.push(`Unknown PostProcessor: ${aiConfig.pipeline.postProcessor}`);
            }
            
            // Validate processor config
            if (aiConfig.pipeline.processorConfig) {
                const processorValidation = processorRegistry.validateProcessorConfig(aiConfig.pipeline.processorConfig);
                if (!processorValidation.valid) {
                    errors.push(...processorValidation.errors);
                }
            }
        }
        
        // Validate output mapping
        if (!aiConfig.outputMapping || !Array.isArray(aiConfig.outputMapping)) {
            errors.push('Output mapping must be an array');
        } else {
            const mappingValidation = postProcessorRegistry.validateOutputMapping(aiConfig.outputMapping);
            if (!mappingValidation.valid) {
                errors.push(...mappingValidation.errors);
            }
        }
        
        // Check for optional configurations
        if (!aiConfig.qualityGates) {
            warnings.push('No quality gates configured - using defaults');
        }
        
        if (!aiConfig.qualityMetaConcepts) {
            warnings.push('No quality meta concepts configured - quality metadata will not be stored');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get pipeline statistics
     * @returns {Object} Pipeline statistics
     */
    getPipelineStats() {
        return {
            preprocessors: preProcessorRegistry.getInfo(),
            processors: processorRegistry.getInfo(),
            postprocessors: postProcessorRegistry.getInfo(),
            qualityGates: {
                registered: this.qualityGateRunner.getRegisteredGates(),
                count: this.qualityGateRunner.getRegisteredGates().length
            },
            version: this.getVersion()
        };
    }

    /**
     * Get supported media types
     * @returns {string[]} Array of supported media types
     */
    getSupportedMediaTypes() {
        const mediaTypes = new Set();
        
        // Collect from preprocessors
        for (const name of preProcessorRegistry.getRegisteredNames()) {
            try {
                const preprocessor = preProcessorRegistry.get(name);
                const types = preprocessor.getSupportedMediaTypes();
                types.forEach(type => mediaTypes.add(type));
            } catch (error) {
                // Skip invalid preprocessors
            }
        }
        
        return Array.from(mediaTypes);
    }

    /**
     * Get pipeline version
     * @returns {string} Version
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Warm up all components (create instances)
     * @returns {Promise<void>}
     */
    async warmUp() {
        try {
            // Warm up registries
            await postProcessorRegistry.warmUp();
            
            General.logDebug('AIPipeline', 'Pipeline components warmed up');
        } catch (error) {
            General.logError('AIPipeline', `Failed to warm up pipeline: ${error.message}`);
        }
    }

    /**
     * Clear all cached instances
     */
    clearCache() {
        preProcessorRegistry.clear();
        processorRegistry.clear();
        postProcessorRegistry.clear();
        
        General.logDebug('AIPipeline', 'Pipeline cache cleared');
    }
}

export default AIPipeline;
