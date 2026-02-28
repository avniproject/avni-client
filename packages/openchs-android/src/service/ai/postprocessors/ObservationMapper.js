// @flow
import BasePostProcessor from './BasePostProcessor';
import PipelineStageError from '../pipeline/PipelineStageError';
import General from "../../../../utility/General";

/**
 * ObservationMapper - Generic config-driven observation mapper.
 * Maps inference output to AVNI observations using outputMapping configuration.
 */
class ObservationMapper extends BasePostProcessor {
    constructor() {
        super();
    }

    /**
     * Map inference output to observations using configuration
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Observation[]>} Array of observations
     */
    async mapToObservations(context) {
        const outputMapping = context.aiConfig.outputMapping;
        const rawOutput = context.rawInferenceOutput;
        const observations = [];
        
        General.logDebug('ObservationMapper', `Mapping ${outputMapping.length} outputs to observations`);
        
        try {
            // Process each mapping configuration
            for (const mapping of outputMapping) {
                const observation = await this.processMapping(context, mapping, rawOutput);
                if (observation) {
                    observations.push(observation);
                }
            }
            
            // Add quality observations if configured
            const observationsWithQuality = this.addQualityObservations(context, observations);
            
            General.logDebug('ObservationMapper', `Created ${observationsWithQuality.length} observations`);
            
            return observationsWithQuality;
            
        } catch (error) {
            throw PipelineStageError.postprocessingError(
                'OBSERVATION_MAPPING_FAILED',
                'Failed to map AI results to observations. Please contact support.',
                error.message,
                false
            );
        }
    }

    /**
     * Process a single mapping configuration
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} mapping - Mapping configuration
     * @param {Object} rawOutput - Raw inference output
     * @returns {Promise<Observation|null>} Created observation or null
     */
    async processMapping(context, mapping, rawOutput) {
        try {
            // Extract value using dot notation
            const value = this.extractValue(rawOutput, mapping.sourceKey);
            
            // Skip if value is null/undefined and mapping is not required
            if (value === null || value === undefined) {
                if (mapping.required) {
                    throw new Error(`Required value not found for sourceKey: ${mapping.sourceKey}`);
                } else {
                    General.logDebug('ObservationMapper', `Skipping optional mapping: ${mapping.sourceKey}`);
                    return null;
                }
            }
            
            // Get target concept
            const targetConcept = this.getConceptByUuid(mapping.targetConceptUuid);
            if (!targetConcept) {
                throw new Error(`Target concept not found: ${mapping.targetConceptUuid}`);
            }
            
            // Create observation
            const observation = this.createObservation(mapping, value, targetConcept);
            
            // Add mapping metadata
            if (mapping.metadata) {
                observation.metadata = {
                    ...observation.metadata,
                    mapping: {
                        sourceKey: mapping.sourceKey,
                        transform: mapping.transform,
                        dataType: mapping.dataType
                    }
                };
            }
            
            // Add pipeline metadata
            observation.pipelineMetadata = {
                processorName: context.processorMetadata?.processorName,
                inferenceTime: context.processorMetadata?.inferenceMs,
                confidence: context.processorMetadata?.confidence,
                qualityScore: context.qualityScore?.total,
                qualityTier: context.qualityScore?.tier
            };
            
            General.logDebug('ObservationMapper', `Created observation: ${targetConcept.name} = ${value}`);
            
            return observation;
            
        } catch (error) {
            General.logError('ObservationMapper', `Failed to process mapping ${mapping.sourceKey}: ${error.message}`);
            
            // Decide whether to fail completely or continue
            if (mapping.required) {
                throw error; // Re-throw for required mappings
            } else {
                return null; // Skip optional mappings that fail
            }
        }
    }

    /**
     * Extract value with enhanced error handling and logging
     * @param {Object} output - Inference output
     * @param {string} keyPath - Dot notation key path
     * @returns {*} Extracted value
     */
    extractValue(output, keyPath) {
        if (!keyPath || !output) {
            General.logDebug('ObservationMapper', `Cannot extract value: keyPath=${keyPath}, output=${!!output}`);
            return null;
        }
        
        try {
            const value = super.extractValue(output, keyPath);
            
            if (value === null || value === undefined) {
                General.logDebug('ObservationMapper', `Value not found for keyPath: ${keyPath}`);
                return null;
            }
            
            General.logDebug('ObservationMapper', `Extracted value for ${keyPath}: ${JSON.stringify(value)}`);
            return value;
            
        } catch (error) {
            General.logError('ObservationMapper', `Error extracting value for ${keyPath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Create observation with enhanced validation
     * @param {Object} mapping - Mapping configuration
     * @param {*} value - Value to map
     * @param {Concept} targetConcept - Target concept
     * @returns {Observation} Created observation
     */
    createObservation(mapping, value, targetConcept) {
        try {
            // Apply transformation
            const transformedValue = this.applyTransformation(value, mapping.transform);
            
            // Validate value
            const validatedValue = this.validateValue(transformedValue, targetConcept, mapping.dataType);
            
            // Apply additional validation rules
            const finalValue = this.applyValidationRules(validatedValue, mapping);
            
            // Create observation
            const { Observation } = require('openchs-models');
            const observation = Observation.create(
                targetConcept,
                targetConcept.getValueWrapperFor(finalValue),
                mapping.abnormal || false
            );
            
            // Add mapping-specific metadata
            if (mapping.metadata) {
                observation.metadata = {
                    ...observation.metadata,
                    ...mapping.metadata
                };
            }
            
            return observation;
            
        } catch (error) {
            throw new Error(`Failed to create observation for ${targetConcept.name}: ${error.message}`);
        }
    }

    /**
     * Apply additional validation rules
     * @param {*} value - Validated value
     * @param {Object} mapping - Mapping configuration
     * @returns {*} Final value after validation
     */
    applyValidationRules(value, mapping) {
        if (value === null || value === undefined) {
            return value;
        }
        
        // Apply range validation for numeric values
        if (typeof value === 'number' && mapping.validation) {
            const validation = mapping.validation;
            
            if (validation.min !== undefined && value < validation.min) {
                General.logDebug('ObservationMapper', `Value ${value} below minimum ${validation.min}, using minimum`);
                return validation.min;
            }
            
            if (validation.max !== undefined && value > validation.max) {
                General.logDebug('ObservationMapper', `Value ${value} above maximum ${validation.max}, using maximum`);
                return validation.max;
            }
            
            if (validation.allowedValues && !validation.allowedValues.includes(value)) {
                const closestValue = this.findClosestValue(value, validation.allowedValues);
                General.logDebug('ObservationMapper', `Value ${value} not in allowed values, using closest: ${closestValue}`);
                return closestValue;
            }
        }
        
        // Apply enum validation for coded values
        if (mapping.dataType === 'Coded' && mapping.allowedAnswers) {
            if (!mapping.allowedAnswers.includes(value)) {
                throw new Error(`Value '${value}' not in allowed answers for coded concept`);
            }
        }
        
        return value;
    }

    /**
     * Find closest value in allowed values array
     * @param {number} value - Target value
     * @param {number[]} allowedValues - Allowed values
     * @returns {number} Closest value
     */
    findClosestValue(value, allowedValues) {
        return allowedValues.reduce((closest, current) => 
            Math.abs(current - value) < Math.abs(closest - value) ? current : closest
        );
    }

    /**
     * Get concept with enhanced error handling
     * @param {string} conceptUuid - Concept UUID
     * @returns {Concept|null} Concept or null
     */
    getConceptByUuid(conceptUuid) {
        try {
            // This should be injected via context or service
            // For now, create a mock concept for development
            return {
                uuid: conceptUuid,
                name: `Concept_${conceptUuid.substring(0, 8)}`,
                datatype: 'Text', // Default
                getValueWrapperFor: (value) => ({
                    value: value,
                    valueWrapperType: this.getValueWrapperType(value)
                })
            };
        } catch (error) {
            General.logError('ObservationMapper', `Failed to get concept ${conceptUuid}: ${error.message}`);
            return null;
        }
    }

    /**
     * Determine value wrapper type for a value
     * @param {*} value - Value to check
     * @returns {string} Value wrapper type
     */
    getValueWrapperType(value) {
        if (typeof value === 'number') {
            return 'Numeric';
        } else if (typeof value === 'boolean') {
            return 'Boolean';
        } else if (value instanceof Date) {
            return 'DateTime';
        } else {
            return 'Text';
        }
    }

    /**
     * Validate mapping configuration
     * @param {Object} mapping - Mapping configuration
     * @returns {Object} Validation result
     */
    validateMapping(mapping) {
        const errors = [];
        
        if (!mapping.sourceKey) {
            errors.push('sourceKey is required');
        }
        
        if (!mapping.targetConceptUuid) {
            errors.push('targetConceptUuid is required');
        }
        
        if (!mapping.dataType) {
            errors.push('dataType is required');
        }
        
        // Validate data type
        const validDataTypes = ['Numeric', 'Coded', 'Text', 'DateTime', 'Boolean'];
        if (mapping.dataType && !validDataTypes.includes(mapping.dataType)) {
            errors.push(`Invalid dataType: ${mapping.dataType}`);
        }
        
        // Validate transformation
        if (mapping.transform) {
            const validTransforms = [
                'upperCase', 'lowerCase', 'roundToOne', 'roundToTwo',
                'percentage', 'absolute', 'toString', 'toNumber'
            ];
            if (!validTransforms.includes(mapping.transform)) {
                errors.push(`Invalid transform: ${mapping.transform}`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...super.getProcessingStats(),
            supportedDataTypes: ['Numeric', 'Coded', 'Text', 'DateTime', 'Boolean'],
            supportedTransformations: [
                'upperCase', 'lowerCase', 'roundToOne', 'roundToTwo',
                'percentage', 'absolute', 'toString', 'toNumber'
            ],
            features: [
                'dot_notation_extraction',
                'value_transformation',
                'range_validation',
                'enum_validation',
                'quality_metadata',
                'pipeline_metadata'
            ]
        };
    }

    /**
     * Get processor version
     */
    getVersion() {
        return '1.0.0';
    }
}

export default ObservationMapper;
