// @flow
import General from "../../../../utility/General";

/**
 * PostProcessorRegistry - Registry for managing postprocessor classes.
 * Provides name-to-class mapping for dynamic postprocessor instantiation.
 */
class PostProcessorRegistry {
    constructor() {
        this._processors = new Map();
        this._instances = new Map();
    }

    /**
     * Register a postprocessor class
     * @param {string} name - The name to register the processor under
     * @param {Class} ProcessorClass - The postprocessor class
     */
    register(name, ProcessorClass) {
        if (this._processors.has(name)) {
            General.logWarn('PostProcessorRegistry', `Processor '${name}' is already registered. Overwriting.`);
        }
        
        this._processors.set(name, ProcessorClass);
        this._instances.delete(name); // Clear any cached instance
        
        General.logDebug('PostProcessorRegistry', `Registered postprocessor: ${name}`);
    }

    /**
     * Get a postprocessor instance by name
     * @param {string} name - The name of the processor
     * @returns {BasePostProcessor} - The postprocessor instance
     */
    get(name) {
        if (!this._processors.has(name)) {
            throw new Error(`No postprocessor registered with name: ${name}`);
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
            General.logDebug('PostProcessorRegistry', `Unregistered postprocessor: ${name}`);
        }
    }

    /**
     * Clear all registered processors
     */
    clear() {
        this._processors.clear();
        this._instances.clear();
        General.logDebug('PostProcessorRegistry', 'Cleared all postprocessors');
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
     * Get processors that support a specific data type
     * @param {string} dataType - Data type (Numeric, Coded, Text, etc.)
     * @returns {string[]} - Array of processor names that support the data type
     */
    getProcessorsForDataType(dataType) {
        const supportedProcessors = [];
        
        for (const [name, ProcessorClass] of this._processors) {
            try {
                const processor = new ProcessorClass();
                const supportedTypes = processor.getProcessingStats().supportedDataTypes || [];
                if (supportedTypes.includes(dataType)) {
                    supportedProcessors.push(name);
                }
            } catch (error) {
                General.logWarn('PostProcessorRegistry', `Failed to instantiate ${name}: ${error.message}`);
            }
        }
        
        return supportedProcessors;
    }

    /**
     * Get processors that support a specific transformation
     * @param {string} transformation - Transformation type
     * @returns {string[]} - Array of processor names that support the transformation
     */
    getProcessorsForTransformation(transformation) {
        const supportedProcessors = [];
        
        for (const [name, ProcessorClass] of this._processors) {
            try {
                const processor = new ProcessorClass();
                const supportedTransformations = processor.getProcessingStats().supportedTransformations || [];
                if (supportedTransformations.includes(transformation)) {
                    supportedProcessors.push(name);
                }
            } catch (error) {
                General.logWarn('PostProcessorRegistry', `Failed to instantiate ${name}: ${error.message}`);
            }
        }
        
        return supportedProcessors;
    }

    /**
     * Get the best processor for a given configuration
     * @param {Object} outputMapping - Output mapping configuration
     * @returns {string|null} - Best processor name or null
     */
    getBestProcessor(outputMapping) {
        if (!outputMapping || !Array.isArray(outputMapping)) {
            return 'ObservationMapper'; // Default to generic mapper
        }
        
        // Analyze mapping requirements
        const dataTypes = new Set();
        const transformations = new Set();
        
        for (const mapping of outputMapping) {
            if (mapping.dataType) {
                dataTypes.add(mapping.dataType);
            }
            if (mapping.transform) {
                transformations.add(mapping.transform);
            }
        }
        
        // Check for specialized processors
        const processorNames = this.getRegisteredNames();
        
        // Priority order: specialized > generic
        const priorityOrder = [
            'HbObservationMapper',
            'TranscriptionMapper', 
            'WoundSeverityMapper',
            'ObservationMapper'
        ];
        
        for (const priorityName of priorityOrder) {
            if (processorNames.includes(priorityName)) {
                return priorityName;
            }
        }
        
        return 'ObservationMapper'; // Default fallback
    }

    /**
     * Validate output mapping configuration
     * @param {Object} outputMapping - Output mapping configuration
     * @returns {Object} - Validation result
     */
    validateOutputMapping(outputMapping) {
        if (!outputMapping) {
            return { valid: false, errors: ['Output mapping is required'] };
        }
        
        if (!Array.isArray(outputMapping)) {
            return { valid: false, errors: ['Output mapping must be an array'] };
        }
        
        const errors = [];
        
        for (let i = 0; i < outputMapping.length; i++) {
            const mapping = outputMapping[i];
            
            // Check required fields
            if (!mapping.sourceKey) {
                errors.push(`Mapping ${i}: sourceKey is required`);
            }
            
            if (!mapping.targetConceptUuid) {
                errors.push(`Mapping ${i}: targetConceptUuid is required`);
            }
            
            if (!mapping.dataType) {
                errors.push(`Mapping ${i}: dataType is required`);
            }
            
            // Validate data type
            const validDataTypes = ['Numeric', 'Coded', 'Text', 'DateTime', 'Boolean'];
            if (mapping.dataType && !validDataTypes.includes(mapping.dataType)) {
                errors.push(`Mapping ${i}: Invalid dataType '${mapping.dataType}'`);
            }
            
            // Validate transformation if provided
            if (mapping.transform) {
                const validTransformations = [
                    'upperCase', 'lowerCase', 'roundToOne', 'roundToTwo',
                    'percentage', 'absolute', 'toString', 'toNumber'
                ];
                if (!validTransformations.includes(mapping.transform)) {
                    errors.push(`Mapping ${i}: Invalid transformation '${mapping.transform}'`);
                }
            }
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
            supportedDataTypes: new Set(),
            supportedTransformations: new Set(),
            totalProcessors: this._processors.size
        };
        
        for (const [name, ProcessorClass] of this._processors) {
            try {
                const processor = new ProcessorClass();
                const stats = processor.getProcessingStats();
                
                summary.processors[name] = {
                    supportedDataTypes: stats.supportedDataTypes || [],
                    supportedTransformations: stats.supportedTransformations || [],
                    version: processor.getVersion()
                };
                
                (stats.supportedDataTypes || []).forEach(type => summary.supportedDataTypes.add(type));
                (stats.supportedTransformations || []).forEach(transform => summary.supportedTransformations.add(transform));
                
            } catch (error) {
                General.logWarn('PostProcessorRegistry', `Failed to get capabilities for ${name}: ${error.message}`);
                summary.processors[name] = { error: error.message };
            }
        }
        
        // Convert Sets to Arrays
        summary.supportedDataTypes = Array.from(summary.supportedDataTypes);
        summary.supportedTransformations = Array.from(summary.supportedTransformations);
        
        return summary;
    }

    /**
     * Get processor statistics
     * @returns {Object} - Registry statistics
     */
    getStatistics() {
        const stats = {
            totalRegistered: this._processors.size,
            totalCached: this._instances.size,
            processors: {}
        };
        
        for (const [name, ProcessorClass] of this._processors) {
            stats.processors[name] = {
                registered: true,
                cached: this._instances.has(name),
                className: ProcessorClass.name
            };
        }
        
        return stats;
    }

    /**
     * Warm up processor instances (create all instances)
     * @returns {Promise<void>}
     */
    async warmUp() {
        for (const name of this.getRegisteredNames()) {
            try {
                this.get(name); // This will create and cache the instance
                General.logDebug('PostProcessorRegistry', `Warmed up processor: ${name}`);
            } catch (error) {
                General.logError('PostProcessorRegistry', `Failed to warm up ${name}: ${error.message}`);
            }
        }
    }

    /**
     * Clear cached instances (force recreation on next access)
     */
    clearCache() {
        this._instances.clear();
        General.logDebug('PostProcessorRegistry', 'Cleared processor instance cache');
    }
}

// Create singleton instance
const postProcessorRegistry = new PostProcessorRegistry();

export default postProcessorRegistry;
