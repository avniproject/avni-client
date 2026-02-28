// @flow
import General from "../../../utility/General";

/**
 * PreProcessorRegistry - Registry for managing preprocessor classes.
 * Provides name-to-class mapping for dynamic preprocessor instantiation.
 */
class PreProcessorRegistry {
    constructor() {
        this._processors = new Map();
        this._instances = new Map();
    }

    /**
     * Register a preprocessor class
     * @param {string} name - The name to register the processor under
     * @param {Class} ProcessorClass - The preprocessor class
     */
    register(name, ProcessorClass) {
        if (this._processors.has(name)) {
            General.logWarn('PreProcessorRegistry', `Processor '${name}' is already registered. Overwriting.`);
        }
        
        this._processors.set(name, ProcessorClass);
        this._instances.delete(name); // Clear any cached instance
        
        General.logDebug('PreProcessorRegistry', `Registered processor: ${name}`);
    }

    /**
     * Get a preprocessor instance by name
     * @param {string} name - The name of the processor
     * @returns {BasePreProcessor} - The preprocessor instance
     */
    get(name) {
        if (!this._processors.has(name)) {
            throw new Error(`No preprocessor registered with name: ${name}`);
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
            General.logDebug('PreProcessorRegistry', `Unregistered processor: ${name}`);
        }
    }

    /**
     * Clear all registered processors
     */
    clear() {
        this._processors.clear();
        this._instances.clear();
        General.logDebug('PreProcessorRegistry', 'Cleared all processors');
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
}

// Create singleton instance
const preProcessorRegistry = new PreProcessorRegistry();

export default preProcessorRegistry;
