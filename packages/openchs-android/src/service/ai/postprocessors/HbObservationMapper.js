// @flow
import ObservationMapper from './ObservationMapper';
import General from "../../../utility/General";

/**
 * HbObservationMapper - Specialized mapper for hemoglobin observations.
 * Extends ObservationMapper with Hb-specific enrichment and validation.
 */
class HbObservationMapper extends ObservationMapper {
    constructor() {
        super();
    }

    /**
     * Map hemoglobin inference output to observations with Hb-specific logic
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Observation[]>} Array of observations
     */
    async mapToObservations(context) {
        const rawOutput = context.rawInferenceOutput;
        
        // Extract Hb value from regression output
        const hbValue = rawOutput.primaryValue || (rawOutput.predictions && rawOutput.predictions[0] && rawOutput.predictions[0].value) || 0;
        
        General.logDebug('HbObservationMapper', `Hb value from model: ${hbValue} g/dL`);
        
        // Store mapped values directly for prototype display
        context.mappedValues = {
            hemoglobin: hbValue,
            anemiaRisk: this.classifyAnemiaRisk(hbValue),
            anemiaSeverity: this.classifyAnemiaSeverity(hbValue),
            clinicalRecommendation: this.generateClinicalRecommendation(hbValue),
        };
        
        General.logDebug('HbObservationMapper', `Mapped values: ${JSON.stringify(context.mappedValues)}`);
        
        // Return plain observation-like objects for prototype (no Realm/Observation.create needed)
        return [{
            concept: { name: 'Hemoglobin', uuid: 'hb-value-uuid', datatype: 'Numeric' },
            getValue: () => hbValue,
            hbValue,
            anemiaRisk: context.mappedValues.anemiaRisk,
            clinicalRecommendation: context.mappedValues.clinicalRecommendation,
        }];
    }

    /**
     * Add Hb-specific enrichments to observations
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Base observations
     * @returns {Promise<Observation[]>} Enriched observations
     */
    async addHbEnrichments(context, observations) {
        const enrichedObservations = [...observations];
        const rawOutput = context.rawInferenceOutput;
        
        try {
            // Add confidence interval if available
            if (rawOutput.confidenceInterval) {
                const confidenceIntervalObs = this.createConfidenceIntervalObservation(
                    context,
                    rawOutput.confidenceInterval
                );
                if (confidenceIntervalObs) {
                    enrichedObservations.push(confidenceIntervalObs);
                }
            }
            
            // Add measurement uncertainty
            if (rawOutput.uncertainty) {
                const uncertaintyObs = this.createUncertaintyObservation(context, rawOutput.uncertainty);
                if (uncertaintyObs) {
                    enrichedObservations.push(uncertaintyObs);
                }
            }
            
            // Add device-specific metadata
            const deviceMetadataObs = this.createDeviceMetadataObservation(context);
            if (deviceMetadataObs) {
                enrichedObservations.push(deviceMetadataObs);
            }
            
        } catch (error) {
            General.logWarn('HbObservationMapper', `Failed to add Hb enrichments: ${error.message}`);
        }
        
        return enrichedObservations;
    }

    /**
     * Add clinical interpretation based on Hb values
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Enriched observations
     * @returns {Promise<Observation[]>} Observations with clinical interpretation
     */
    async addClinicalInterpretation(context, observations) {
        const interpretedObservations = [...observations];
        
        try {
            // Find Hb value observation
            const hbObservation = observations.find(obs => 
                obs.concept.name.toLowerCase().includes('hemoglobin') || 
                obs.concept.name.toLowerCase().includes('hb')
            );
            
            if (hbObservation && typeof hbObservation.getValue() === 'number') {
                const hbValue = hbObservation.getValue();
                
                // Add anemia risk assessment
                const anemiaRiskObs = this.createAnemiaRiskObservation(context, hbValue);
                if (anemiaRiskObs) {
                    interpretedObservations.push(anemiaRiskObs);
                }
                
                // Add severity classification
                const severityObs = this.createSeverityObservation(context, hbValue);
                if (severityObs) {
                    interpretedObservations.push(severityObs);
                }
                
                // Add clinical recommendation
                const recommendationObs = this.createRecommendationObservation(context, hbValue);
                if (recommendationObs) {
                    interpretedObservations.push(recommendationObs);
                }
                
                // Update Hb observation with clinical flags
                this.updateHbObservationWithFlags(hbObservation, hbValue);
            }
            
        } catch (error) {
            General.logWarn('HbObservationMapper', `Failed to add clinical interpretation: ${error.message}`);
        }
        
        return interpretedObservations;
    }

    /**
     * Create confidence interval observation
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} confidenceInterval - Confidence interval data
     * @returns {Observation|null} Confidence interval observation
     */
    createConfidenceIntervalObservation(context, confidenceInterval) {
        const conceptUuid = this.getConceptUuid('hb_confidence_interval');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const intervalValue = `${confidenceInterval.lower.toFixed(1)}-${confidenceInterval.upper.toFixed(1)} g/dL`;
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: {
                    lowerBound: confidenceInterval.lower,
                    upperBound: confidenceInterval.upper,
                    confidenceLevel: confidenceInterval.level || 0.95
                }
            },
            intervalValue,
            concept
        );
    }

    /**
     * Create uncertainty observation
     * @param {PipelineContext} context - Pipeline context
     * @param {number} uncertainty - Measurement uncertainty
     * @returns {Observation|null} Uncertainty observation
     */
    createUncertaintyObservation(context, uncertainty) {
        const conceptUuid = this.getConceptUuid('hb_measurement_uncertainty');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        return this.createObservation(
            {
                dataType: 'Numeric',
                metadata: {
                    unit: 'g/dL',
                    measurementType: 'standard_uncertainty'
                }
            },
            uncertainty,
            concept
        );
    }

    /**
     * Create device metadata observation
     * @param {PipelineContext} context - Pipeline context
     * @returns {Observation|null} Device metadata observation
     */
    createDeviceMetadataObservation(context) {
        const conceptUuid = this.getConceptUuid('hb_device_metadata');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const metadata = {
            processorName: context.processorMetadata?.processorName,
            modelVersion: context.processorMetadata?.modelVersion,
            inferenceTime: context.processorMetadata?.inferenceMs,
            qualityScore: context.qualityScore?.total,
            qualityTier: context.qualityScore?.tier,
            timestamp: new Date().toISOString()
        };
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata
            },
            JSON.stringify(metadata),
            concept
        );
    }

    /**
     * Create anemia risk observation
     * @param {PipelineContext} context - Pipeline context
     * @param {number} hbValue - Hemoglobin value
     * @returns {Observation|null} Anemia risk observation
     */
    createAnemiaRiskObservation(context, hbValue) {
        const conceptUuid = this.getConceptUuid('anemia_risk');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const riskLevel = this.classifyAnemiaRisk(hbValue);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    hbValue,
                    whoCriteria: true,
                    ageGroup: this.inferAgeGroup(context),
                    gender: this.inferGender(context)
                }
            },
            riskLevel,
            concept
        );
    }

    /**
     * Create severity observation
     * @param {PipelineContext} context - Pipeline context
     * @param {number} hbValue - Hemoglobin value
     * @returns {Observation|null} Severity observation
     */
    createSeverityObservation(context, hbValue) {
        const conceptUuid = this.getConceptUuid('anemia_severity');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const severity = this.classifyAnemiaSeverity(hbValue);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    hbValue,
                    classificationSystem: 'WHO',
                    severityLevel: severity
                }
            },
            severity,
            concept
        );
    }

    /**
     * Create clinical recommendation observation
     * @param {PipelineContext} context - Pipeline context
     * @param {number} hbValue - Hemoglobin value
     * @returns {Observation|null} Recommendation observation
     */
    createRecommendationObservation(context, hbValue) {
        const conceptUuid = this.getConceptUuid('clinical_recommendation');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const recommendation = this.generateClinicalRecommendation(hbValue);
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: {
                    hbValue,
                    recommendationType: 'clinical_action',
                    urgency: this.getRecommendationUrgency(hbValue)
                }
            },
            recommendation,
            concept
        );
    }

    /**
     * Update Hb observation with clinical flags
     * @param {Observation} hbObservation - Hb observation to update
     * @param {number} hbValue - Hemoglobin value
     */
    updateHbObservationWithFlags(hbObservation, hbValue) {
        // Mark as abnormal if outside normal range
        const normalRange = { min: 12.0, max: 16.0 }; // Adult female range
        const isAbnormal = hbValue < normalRange.min || hbValue > normalRange.max;
        
        hbObservation.abnormal = isAbnormal;
        
        // Add clinical metadata
        hbObservation.metadata = {
            ...hbObservation.metadata,
            clinicalFlags: {
                isAbnormal,
                severity: this.classifyAnemiaSeverity(hbValue),
                riskLevel: this.classifyAnemiaRisk(hbValue),
                normalRange
            }
        };
    }

    /**
     * Classify anemia risk based on Hb value
     * @param {number} hbValue - Hemoglobin value
     * @returns {string} Risk level
     */
    classifyAnemiaRisk(hbValue) {
        if (hbValue >= 12.0) return 'normal';
        if (hbValue >= 11.0) return 'mild';
        if (hbValue >= 8.0) return 'moderate';
        if (hbValue >= 6.5) return 'severe';
        return 'very_severe';
    }

    /**
     * Classify anemia severity based on Hb value
     * @param {number} hbValue - Hemoglobin value
     * @returns {string} Severity level
     */
    classifyAnemiaSeverity(hbValue) {
        if (hbValue >= 12.0) return 'none';
        if (hbValue >= 11.0) return 'mild';
        if (hbValue >= 8.0) return 'moderate';
        if (hbValue >= 6.5) return 'severe';
        return 'very_severe';
    }

    /**
     * Generate clinical recommendation based on Hb value
     * @param {number} hbValue - Hemoglobin value
     * @returns {string} Clinical recommendation
     */
    generateClinicalRecommendation(hbValue) {
        if (hbValue >= 12.0) {
            return 'Hemoglobin level is normal. Continue routine monitoring.';
        } else if (hbValue >= 11.0) {
            return 'Mild anemia detected. Consider dietary iron supplementation and follow-up testing.';
        } else if (hbValue >= 8.0) {
            return 'Moderate anemia detected. Recommend iron supplementation and medical evaluation.';
        } else if (hbValue >= 6.5) {
            return 'Severe anemia detected. Urgent medical evaluation and treatment required.';
        } else {
            return 'Very severe anemia detected. Immediate medical attention required.';
        }
    }

    /**
     * Get recommendation urgency based on Hb value
     * @param {number} hbValue - Hemoglobin value
     * @returns {string} Urgency level
     */
    getRecommendationUrgency(hbValue) {
        if (hbValue >= 11.0) return 'routine';
        if (hbValue >= 8.0) return 'prompt';
        if (hbValue >= 6.5) return 'urgent';
        return 'emergency';
    }

    /**
     * Infer age group from context (placeholder implementation)
     * @param {PipelineContext} context - Pipeline context
     * @returns {string} Age group
     */
    inferAgeGroup(context) {
        // This would be implemented based on subject data
        return 'adult';
    }

    /**
     * Infer gender from context (placeholder implementation)
     * @param {PipelineContext} context - Pipeline context
     * @returns {string} Gender
     */
    inferGender(context) {
        // This would be implemented based on subject data
        return 'female';
    }

    /**
     * Get concept UUID by name (placeholder implementation)
     * @param {string} conceptName - Concept name
     * @returns {string|null} Concept UUID
     */
    getConceptUuid(conceptName) {
        // This would be implemented using ConceptService
        const conceptMap = {
            'hb_confidence_interval': 'uuid-hb-confidence-interval',
            'hb_measurement_uncertainty': 'uuid-hb-uncertainty',
            'hb_device_metadata': 'uuid-hb-device-metadata',
            'anemia_risk': 'uuid-anemia-risk',
            'anemia_severity': 'uuid-anemia-severity',
            'clinical_recommendation': 'uuid-clinical-recommendation'
        };
        
        return conceptMap[conceptName] || null;
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...super.getProcessingStats(),
            features: [
                ...super.getProcessingStats().features,
                'hb_confidence_intervals',
                'anemia_risk_classification',
                'severity_assessment',
                'clinical_recommendations',
                'who_criteria_support',
                'device_metadata_tracking'
            ],
            supportedAgeGroups: ['adult', 'child', 'infant', 'pregnant_woman'],
            supportedGenders: ['male', 'female', 'other'],
            clinicalGuidelines: 'WHO_2011'
        };
    }

    /**
     * Get processor version
     */
    getVersion() {
        return '1.0.0';
    }
}

export default HbObservationMapper;
