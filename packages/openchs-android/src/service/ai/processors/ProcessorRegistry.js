// @flow
import General from "../../../../utility/General";

/**
 * ProcessorRegistry - Registry for managing processor classes.
 * Provides name-to-class mapping for dynamic processor instantiation.
 */
class ProcessorRegistry {
    constructor() {
        this._processors = new Map();
        this._instances = new Map();
    }

    /**
     * Register a processor class
     * @param {string} name - The name to register the processor under
     * @param {Class} ProcessorClass - The processor class
     */
    register(name, ProcessorClass) {
        if (this._processors.has(name)) {
            General.logWarn('ProcessorRegistry', `Processor '${name}' is already registered. Overwriting.`);
        }
        
        this._processors.set(name, ProcessorClass);
        this._instances.delete(name); // Clear any cached instance
        
        General.logDebug('ProcessorRegistry', `Registered processor: ${name}`);
    }

    /**
     * Get a processor instance by name
     * @param {string} name - The name of the processor
     * @returns {BaseProcessor} - The processor instance
     */
    get(name) {
        if (!this._processors.has(name)) {
            throw new Error(`No processor registered with name: ${name}`);
        }

        // Use singleton pattern for processor instances
        if (!this._instances.has(name)) {
            const ProcessorClass = this._processors.get(name);
            this._instances.set(name, new ProcessorClass());
        }

        return this._instances.get(name);
    }

    /**
     * Check if a processor is registered
     * @param {string} name - The name to check
     * @returns {boolean}
     */
    has(name) {
        return this._processors.has(name);
    }

    /**
     * Get all registered processor names
     * @returns {string[]} - Array of registered names
     */
    getRegisteredNames() {
        return Array.from(this._processors.keys());
    }

    /**
     * Unregister a processor
     * @param {string} name - The name to unregister
     */
    unregister(name) {
        if (this._processors.delete(name)) {
            this._instances.delete(name);
            General.logDebug('ProcessorRegistry', `Unregistered processor: ${name}`);
        }
    }

    /**
     * Clear all registered processors
     */
    clear() {
        this._processors.clear();
        this._instances.clear();
        General.logDebug('ProcessorRegistry', 'Cleared all processors');
    }

    /**
     * Get processor information for debugging
     * @returns {Object} - Registry information
     */
    getInfo() {
        return {
            registeredCount: this._processors.size,
            cachedInstances: this._instances.size,
            processors: this.getRegisteredNames()
        };
    }

    /**
     * Get processors that support a specific model type
     * @param {string} modelType - Model type (classification, regression, segmentation)
     * @returns {string[]} - Array of processor names that support the model type
     */
    getProcessorsForModelType(modelType) {
        const supportedProcessors = [];
        
        for (const [name, ProcessorClass] of this._processors) {
            try {
                const processor = new ProcessorClass();
                if (processor.supportsModelType(modelType)) {
                    supportedProcessors.push(name);
                }
            } catch (error) {
                General.logWarn('ProcessorRegistry', `Failed to instantiate ${name}: ${error.message}`);
            }
        }
        
        return supportedProcessors;
    }

    /**
     * Get processors that support a specific media type
     * @param {string} mimeType - Media MIME type
     * @returns {string[]} - Array of processor names that support the media type
     */
    getProcessorsForMediaType(mimeType) {
        const supportedProcessors = [];
        
        for (const [name, ProcessorClass] of this._processors) {
            try {
                const processor = new ProcessorClass();
                const supportedTypes = processor.getSupportedMediaTypes();
                if (supportedTypes.includes(mimeType) || supportedTypes.includes('*/*')) {
                    supportedProcessors.push(name);
                }
            } catch (error) {
                General.logWarn('ProcessorRegistry', `Failed to instantiate ${name}: ${error.message}`);
            }
        }
        
        return supportedProcessors;
    }

    /**
     * Get the best processor for a given configuration
     * @param {Object} processorConfig - Processor configuration
     * @param {string} mimeType - Media MIME type
     * @returns {string|null} - Best processor name or null
     */
    getBestProcessor(processorConfig, mimeType) {
        const modelType = processorConfig.outputType;
        
        // Get processors that support both model type and media type
        const modelTypeProcessors = this.getProcessorsForModelType(modelType);
        const mediaTypeProcessors = this.getProcessorsForMediaType(mimeType);
        
        const compatibleProcessors = modelTypeProcessors.filter(name => 
            mediaTypeProcessors.includes(name)
        );
        
        if (compatibleProcessors.length === 0) {
            return null;
        }
        
        // Priority order: TFLite > ONNX > RuleBased
        const priorityOrder = ['TFLiteProcessor', 'ONNXProcessor', 'RuleBasedProcessor'];
        
        for (const priorityName of priorityOrder) {
            if (compatibleProcessors.includes(priorityName)) {
                return priorityName;
            }
        }
        
        // Return first compatible processor if no priority match
        return compatibleProcessors[0];
    }

    /**
     * Validate processor configuration against registered processors
     * @param {Object} processorConfig - Processor configuration
     * @returns {Object} - Validation result
     */
    validateProcessorConfig(processorConfig) {
        if (!processorConfig) {
            return { valid: false, errors: ['Processor configuration is required'] };
        }
        
        const errors = [];
        
        // Check if processor name is specified
        const processorName = processorConfig.processor;
        if (!processorName) {
            errors.push('Processor name is required');
        } else if (!this.has(processorName)) {
            errors.push(`Unknown processor: ${processorName}`);
        }
        
        // Check model file
        if (!processorConfig.modelFile) {
            errors.push('Model file is required');
        }
        
        // Check input shape
        if (!processorConfig.inputShape) {
            errors.push('Input shape is required');
        } else if (!Array.isArray(processorConfig.inputShape) || processorConfig.inputShape.length !== 4) {
            errors.push('Input shape must be an array of 4 elements [batch, height, width, channels]');
        }
        
        // Check output type
        if (!processorConfig.outputType) {
            errors.push('Output type is required');
        } else if (!['classification', 'regression', 'segmentation'].includes(processorConfig.outputType)) {
            errors.push('Output type must be classification, regression, or segmentation');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get processor capabilities summary
     * @returns {Object} - Capabilities summary
     */
    getCapabilitiesSummary() {
        const summary = {
            processors: {},
            modelTypes: new Set(),
            mediaTypes: new Set(),
            totalProcessors: this._processors.size
        };
        
        for (const [name, ProcessorClass] of this._processors) {
            try {
                const processor = new ProcessorClass();
                const supportedModelTypes = processor.getSupportedModelTypes();
                const supportedMediaTypes = processor.getSupportedMediaTypes();
                
                summary.processors[name] = {
                    supportedModelTypes,
                    supportedMediaTypes,
                    version: processor.getVersion()
                };
                
                supportedModelTypes.forEach(type => summary.modelTypes.add(type));
                supportedMediaTypes.forEach(type => summary.mediaTypes.add(type));
                
            } catch (error) {
                General.logWarn('ProcessorRegistry', `Failed to get capabilities for ${name}: ${error.message}`);
                summary.processors[name] = { error: error.message };
            }
        }
        
        // Convert Sets to Arrays
        summary.modelTypes = Array.from(summary.modelTypes);
        summary.mediaTypes = Array.from(summary.mediaTypes);
        
        return summary;
    }
}

// Create singleton instance
const processorRegistry = new ProcessorRegistry();

export default processorRegistry;
