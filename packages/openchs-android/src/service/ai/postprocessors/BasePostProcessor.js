// @flow
import PipelineStageError from '../pipeline/PipelineStageError';
import General from "../../../utility/General";

/**
 * BasePostProcessor - Abstract base class for all post-processors.
 * Provides common interface for mapping inference results to AVNI observations.
 */
class BasePostProcessor {
    constructor() {
        if (this.constructor === BasePostProcessor) {
            throw new Error("BasePostProcessor is abstract and cannot be instantiated directly");
        }
    }

    /**
     * Main post-processing entry point
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<void>}
     */
    async process(context) {
        try {
            context.setStage('POSTPROCESSING');
            
            // Validate context has required data
            this.validateContext(context);
            
            // Map inference output to observations
            const observations = await this.mapToObservations(context);
            
            // Store observations in context
            context.observations = observations;
            
            // Store mapped values for reference
            context.mappedValues = this.extractMappedValues(observations);
            
            General.logDebug('BasePostProcessor', `Post-processing completed with ${observations.length} observations`);
            
        } catch (error) {
            if (error instanceof PipelineStageError) {
                throw error;
            }
            
            throw PipelineStageError.postprocessingError(
                'POSTPROCESSING_FAILED',
                'Failed to process AI results. Please contact support.',
                error.message,
                false
            );
        }
    }

    /**
     * Override this method in subclasses to implement specific mapping logic
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Observation[]>} Array of observations
     */
    async mapToObservations(context) {
        throw new Error("mapToObservations must be implemented by subclasses");
    }

    /**
     * Validate that context has required data for post-processing
     * @param {PipelineContext} context - The pipeline context
     */
    validateContext(context) {
        if (!context) {
            throw new Error("Pipeline context is required");
        }
        
        if (!context.rawInferenceOutput) {
            throw new Error("Raw inference output is required for post-processing");
        }
        
        if (!context.aiConfig || !context.aiConfig.outputMapping) {
            throw new Error("Output mapping configuration is required");
        }
        
        if (!context.concept) {
            throw new Error("Source concept is required for observation mapping");
        }
    }

    /**
     * Extract mapped values from observations for reference
     * @param {Observation[]} observations - Array of observations
     * @returns {Object} Mapped values object
     */
    extractMappedValues(observations) {
        const values = {};
        
        for (const observation of observations) {
            if (observation.concept && observation.concept.name) {
                values[observation.concept.name] = observation.getValue();
            }
        }
        
        return values;
    }

    /**
     * Get value from inference output using dot notation
     * @param {Object} output - Inference output
     * @param {string} keyPath - Dot notation key path (e.g., "results.hemoglobin.value")
     * @returns {*} Extracted value
     */
    extractValue(output, keyPath) {
        if (!keyPath || !output) {
            return null;
        }
        
        const keys = keyPath.split('.');
        let value = output;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    }

    /**
     * Apply transformation to a value
     * @param {*} value - Original value
     * @param {string|null} transform - Transformation type
     * @returns {*} Transformed value
     */
    applyTransformation(value, transform) {
        if (!transform || value === null || value === undefined) {
            return value;
        }
        
        switch (transform) {
            case 'upperCase':
                return typeof value === 'string' ? value.toUpperCase() : value;
                
            case 'lowerCase':
                return typeof value === 'string' ? value.toLowerCase() : value;
                
            case 'roundToOne':
                return typeof value === 'number' ? Math.round(value * 10) / 10 : value;
                
            case 'roundToTwo':
                return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
                
            case 'percentage':
                return typeof value === 'number' ? Math.round(value * 100) : value;
                
            case 'absolute':
                return typeof value === 'number' ? Math.abs(value) : value;
                
            case 'toString':
                return String(value);
                
            case 'toNumber':
                const num = Number(value);
                return isNaN(num) ? value : num;
                
            default:
                General.logWarn('BasePostProcessor', `Unknown transformation: ${transform}`);
                return value;
        }
    }

    /**
     * Create an observation from mapping configuration
     * @param {Object} mapping - Output mapping configuration
     * @param {*} value - Mapped value
     * @param {Concept} targetConcept - Target concept
     * @returns {Observation} Created observation
     */
    createObservation(mapping, value, targetConcept) {
        const { Observation } = require('openchs-models');
        
        // Apply transformation if specified
        const transformedValue = this.applyTransformation(value, mapping.transform);
        
        // Validate value against concept datatype
        const validatedValue = this.validateValue(transformedValue, targetConcept, mapping.dataType);
        
        // Create observation
        const observation = Observation.create(
            targetConcept,
            targetConcept.getValueWrapperFor(validatedValue),
            mapping.abnormal || false
        );
        
        // Add metadata if available
        if (mapping.metadata) {
            observation.metadata = mapping.metadata;
        }
        
        return observation;
    }

    /**
     * Validate value against concept datatype
     * @param {*} value - Value to validate
     * @param {Concept} concept - Target concept
     * @param {string} expectedDataType - Expected data type
     * @returns {*} Validated value
     */
    validateValue(value, concept, expectedDataType) {
        // If no expected type, use concept's datatype
        const dataType = expectedDataType || concept.datatype;
        
        switch (dataType) {
            case 'Numeric':
                const numValue = Number(value);
                if (isNaN(numValue)) {
                    throw new Error(`Invalid numeric value: ${value} for concept ${concept.name}`);
                }
                return numValue;
                
            case 'Coded':
                // For coded values, expect UUID or string that maps to answer concept
                if (typeof value === 'string') {
                    return value; // Assume it's a UUID or valid answer
                }
                return String(value);
                
            case 'Text':
                return String(value);
                
            case 'DateTime':
                if (value instanceof Date) {
                    return value;
                }
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime())) {
                    throw new Error(`Invalid date value: ${value} for concept ${concept.name}`);
                }
                return dateValue;
                
            case 'Boolean':
                if (typeof value === 'boolean') {
                    return value;
                }
                if (typeof value === 'string') {
                    return value.toLowerCase() === 'true';
                }
                if (typeof value === 'number') {
                    return value !== 0;
                }
                return Boolean(value);
                
            default:
                return value;
        }
    }

    /**
     * Get concept by UUID
     * @param {string} conceptUuid - Concept UUID
     * @returns {Concept|null} Concept or null if not found
     */
    getConceptByUuid(conceptUuid) {
        try {
            // This should be injected or passed in context
            // For now, return a placeholder
            return { uuid: conceptUuid, name: `Concept_${conceptUuid.substring(0, 8)}` };
        } catch (error) {
            General.logError('BasePostProcessor', `Failed to get concept ${conceptUuid}: ${error.message}`);
            return null;
        }
    }

    /**
     * Add quality observations if configured
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Existing observations
     * @returns {Observation[]} Observations with quality metadata added
     */
    addQualityObservations(context, observations) {
        const qualityMetaConcepts = context.aiConfig.qualityMetaConcepts;
        
        if (!qualityMetaConcepts) {
            return observations;
        }
        
        const newObservations = [...observations];
        
        // Add quality score observation
        if (qualityMetaConcepts.qualityScore && context.qualityScore) {
            const qualityConcept = this.getConceptByUuid(qualityMetaConcepts.qualityScore);
            if (qualityConcept) {
                const qualityObs = this.createObservation(
                    { dataType: 'Numeric' },
                    context.qualityScore.total,
                    qualityConcept
                );
                newObservations.push(qualityObs);
            }
        }
        
        // Add reliability tier observation
        if (qualityMetaConcepts.reliability && context.qualityScore) {
            const reliabilityConcept = this.getConceptByUuid(qualityMetaConcepts.reliability);
            if (reliabilityConcept) {
                const reliabilityObs = this.createObservation(
                    { dataType: 'Coded' },
                    context.qualityScore.tier,
                    reliabilityConcept
                );
                newObservations.push(reliabilityObs);
            }
        }
        
        return newObservations;
    }

    /**
     * Get the name of this postprocessor
     * @returns {string} Postprocessor name
     */
    getName() {
        return this.constructor.name;
    }

    /**
     * Get the version of this postprocessor
     * @returns {string} Postprocessor version
     */
    getVersion() {
        return '1.0.0';
    }

    /**
     * Check if this postprocessor should run in the current context
     * @param {PipelineContext} context - Pipeline context
     * @returns {boolean}
     */
    shouldRun(context) {
        // Basic validation
        try {
            this.validateContext(context);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get processing statistics
     * @returns {Object} Processing statistics
     */
    getProcessingStats() {
        return {
            name: this.getName(),
            version: this.getVersion(),
            supportedDataTypes: ['Numeric', 'Coded', 'Text', 'DateTime', 'Boolean'],
            supportedTransformations: [
                'upperCase', 'lowerCase', 'roundToOne', 'roundToTwo', 
                'percentage', 'absolute', 'toString', 'toNumber'
            ]
        };
    }
}

export default BasePostProcessor;
