// @flow
import ObservationMapper from './ObservationMapper';
import General from "../../../utility/General";

/**
 * WoundSeverityMapper - Specialized mapper for wound severity observations.
 * Maps wound analysis output to AVNI observations with wound-specific enrichments.
 */
class WoundSeverityMapper extends ObservationMapper {
    constructor() {
        super();
    }

    /**
     * Map wound analysis output to observations with wound-specific logic
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Observation[]>} Array of observations
     */
    async mapToObservations(context) {
        // Get base observations from generic mapper
        const baseObservations = await super.mapToObservations(context);
        
        // Add wound-specific enrichments
        const enrichedObservations = await this.addWoundEnrichments(context, baseObservations);
        
        // Add clinical assessment
        const assessedObservations = await this.addClinicalAssessment(context, enrichedObservations);
        
        General.logDebug('WoundSeverityMapper', `Created ${assessedObservations.length} wound observations`);
        
        return assessedObservations;
    }

    /**
     * Add wound-specific enrichments to observations
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Base observations
     * @returns {Promise<Observation[]>} Enriched observations
     */
    async addWoundEnrichments(context, observations) {
        const enrichedObservations = [...observations];
        const rawOutput = context.rawInferenceOutput;
        
        try {
            // Add wound classification details
            if (rawOutput.classification) {
                const classificationObs = this.createWoundClassificationObservation(context, rawOutput.classification);
                if (classificationObs) {
                    enrichedObservations.push(classificationObs);
                }
            }
            
            // Add tissue analysis
            if (rawOutput.tissueAnalysis) {
                const tissueObs = this.createTissueAnalysisObservation(context, rawOutput.tissueAnalysis);
                if (tissueObs) {
                    enrichedObservations.push(tissueObs);
                }
            }
            
            // Add infection indicators
            if (rawOutput.infectionIndicators) {
                const infectionObs = this.createInfectionIndicatorsObservation(context, rawOutput.infectionIndicators);
                if (infectionObs) {
                    enrichedObservations.push(infectionObs);
                }
            }
            
            // Add healing stage assessment
            const healingObs = this.createHealingStageObservation(context);
            if (healingObs) {
                enrichedObservations.push(healingObs);
            }
            
        } catch (error) {
            General.logWarn('WoundSeverityMapper', `Failed to add wound enrichments: ${error.message}`);
        }
        
        return enrichedObservations;
    }

    /**
     * Add clinical assessment based on wound analysis
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Enriched observations
     * @returns {Promise<Observation[]>} Observations with clinical assessment
     */
    async addClinicalAssessment(context, observations) {
        const assessedObservations = [...observations];
        
        try {
            // Find wound severity observation
            const severityObs = observations.find(obs => 
                obs.concept.name.toLowerCase().includes('severity') || 
                obs.concept.name.toLowerCase().includes('wound')
            );
            
            if (severityObs) {
                const severityValue = severityObs.getValue();
                
                // Add treatment recommendation
                const treatmentObs = this.createTreatmentRecommendationObservation(context, severityValue);
                if (treatmentObs) {
                    assessedObservations.push(treatmentObs);
                }
                
                // Add follow-up schedule
                const followUpObs = this.createFollowUpScheduleObservation(context, severityValue);
                if (followUpObs) {
                    assessedObservations.push(followUpObs);
                }
                
                // Add risk assessment
                const riskObs = this.createRiskAssessmentObservation(context, severityValue);
                if (riskObs) {
                    assessedObservations.push(riskObs);
                }
                
                // Update severity observation with clinical flags
                this.updateSeverityObservation(severityObs, context);
            }
            
        } catch (error) {
            General.logWarn('WoundSeverityMapper', `Failed to add clinical assessment: ${error.message}`);
        }
        
        return assessedObservations;
    }

    /**
     * Create wound classification observation
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} classification - Wound classification data
     * @returns {Observation|null} Classification observation
     */
    createWoundClassificationObservation(context, classification) {
        const conceptUuid = this.getConceptUuid('wound_classification');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    woundType: classification.type,
                    characteristics: classification.characteristics || [],
                    location: classification.location,
                    etiology: classification.etiology,
                    duration: classification.duration
                }
            },
            classification.primaryType || 'unknown',
            concept
        );
    }

    /**
     * Create tissue analysis observation
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} tissueAnalysis - Tissue analysis data
     * @returns {Observation|null} Tissue analysis observation
     */
    createTissueAnalysisObservation(context, tissueAnalysis) {
        const conceptUuid = this.getConceptUuid('tissue_analysis');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: {
                    tissueTypes: tissueAnalysis.tissueTypes || [],
                    granulationPercentage: tissueAnalysis.granulationPercentage || 0,
                    necrosisPercentage: tissueAnalysis.necrosisPercentage || 0,
                    sloughPercentage: tissueAnalysis.sloughPercentage || 0,
                    epithelializationPercentage: tissueAnalysis.epithelializationPercentage || 0
                }
            },
            JSON.stringify(tissueAnalysis),
            concept
        );
    }

    /**
     * Create infection indicators observation
     * @param {PipelineContext} context - Pipeline context
     * @param {Object} infectionIndicators - Infection indicators data
     * @returns {Observation|null} Infection indicators observation
     */
    createInfectionIndicatorsObservation(context, infectionIndicators) {
        const conceptUuid = this.getConceptUuid('infection_indicators');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const infectionRisk = this.assessInfectionRisk(infectionIndicators);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    indicators: infectionIndicators.indicators || [],
                    severity: infectionIndicators.severity || 'unknown',
                    confidence: infectionIndicators.confidence || 0,
                    riskFactors: infectionIndicators.riskFactors || []
                }
            },
            infectionRisk,
            concept
        );
    }

    /**
     * Create healing stage observation
     * @param {PipelineContext} context - Pipeline context
     * @returns {Observation|null} Healing stage observation
     */
    createHealingStageObservation(context) {
        const conceptUuid = this.getConceptUuid('healing_stage');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const healingStage = this.assessHealingStage(context);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    stage: healingStage.stage,
                    progression: healingStage.progression,
                    estimatedTimeToHeal: healingStage.estimatedTimeToHeal,
                    factors: healingStage.factors
                }
            },
            healingStage.primaryStage,
            concept
        );
    }

    /**
     * Create treatment recommendation observation
     * @param {PipelineContext} context - Pipeline context
     * @param {string} severityValue - Wound severity
     * @returns {Observation|null} Treatment recommendation observation
     */
    createTreatmentRecommendationObservation(context, severityValue) {
        const conceptUuid = this.getConceptUuid('treatment_recommendation');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const recommendation = this.generateTreatmentRecommendation(severityValue);
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: {
                    severity: severityValue,
                    urgency: recommendation.urgency,
                    category: recommendation.category,
                    interventions: recommendation.interventions
                }
            },
            recommendation.text,
            concept
        );
    }

    /**
     * Create follow-up schedule observation
     * @param {PipelineContext} context - Pipeline context
     * @param {string} severityValue - Wound severity
     * @returns {Observation|null} Follow-up schedule observation
     */
    createFollowUpScheduleObservation(context, severityValue) {
        const conceptUuid = this.getConceptUuid('follow_up_schedule');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const schedule = this.generateFollowUpSchedule(severityValue);
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: {
                    severity: severityValue,
                    frequency: schedule.frequency,
                    duration: schedule.duration,
                    monitoring: schedule.monitoring
                }
            },
            schedule.text,
            concept
        );
    }

    /**
     * Create risk assessment observation
     * @param {PipelineContext} context - Pipeline context
     * @param {string} severityValue - Wound severity
     * @returns {Observation|null} Risk assessment observation
     */
    createRiskAssessmentObservation(context, severityValue) {
        const conceptUuid = this.getConceptUuid('risk_assessment');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const riskAssessment = this.assessOverallRisk(context, severityValue);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    severity: severityValue,
                    riskLevel: riskAssessment.level,
                    factors: riskAssessment.factors,
                    complications: riskAssessment.complications,
                    prevention: riskAssessment.prevention
                }
            },
            riskAssessment.level,
            concept
        );
    }

    /**
     * Update severity observation with clinical flags
     * @param {Observation} severityObs - Severity observation
     * @param {PipelineContext} context - Pipeline context
     */
    updateSeverityObservation(severityObs, context) {
        const severityValue = severityObs.getValue();
        
        // Mark as abnormal if severity is not normal
        const isAbnormal = severityValue !== 'normal' && severityValue !== 'healed';
        severityObs.abnormal = isAbnormal;
        
        // Add clinical metadata
        severityObs.metadata = {
            ...severityObs.metadata,
            clinicalFlags: {
                isAbnormal,
                requiresTreatment: this.requiresTreatment(severityValue),
                requiresFollowUp: this.requiresFollowUp(severityValue),
                urgency: this.getUrgency(severityValue)
            }
        };
    }

    // Helper methods

    assessInfectionRisk(infectionIndicators) {
        const indicators = infectionIndicators.indicators || [];
        const severity = infectionIndicators.severity || 'unknown';
        
        const highRiskIndicators = ['pus', 'odor', 'increased_redness', 'swelling', 'warmth', 'fever'];
        const presentRiskFactors = indicators.filter(indicator => 
            highRiskIndicators.includes(indicator.toLowerCase())
        );
        
        if (presentRiskFactors.length >= 3 || severity === 'severe') {
            return 'high_risk';
        } else if (presentRiskFactors.length >= 1 || severity === 'moderate') {
            return 'moderate_risk';
        } else if (presentRiskFactors.length > 0) {
            return 'low_risk';
        }
        
        return 'no_risk';
    }

    assessHealingStage(context) {
        const qualityScore = context.qualityScore?.total || 0;
        const metadata = context.mediaMetadata || {};
        
        let primaryStage = 'inflammatory';
        let progression = 'stable';
        let estimatedTimeToHeal = 'unknown';
        const factors = [];
        
        // Simple healing stage assessment based on quality and metadata
        if (qualityScore >= 80) {
            primaryStage = 'proliferative';
            progression = 'healing';
            estimatedTimeToHeal = '1-2_weeks';
        } else if (qualityScore >= 60) {
            primaryStage = 'early_proliferative';
            progression = 'improving';
            estimatedTimeToHeal = '2-4_weeks';
        } else if (qualityScore >= 40) {
            primaryStage = 'late_inflammatory';
            progression = 'slow';
            estimatedTimeToHeal = '4-8_weeks';
        } else {
            primaryStage = 'chronic';
            progression = 'stalled';
            estimatedTimeToHeal = '8+_weeks';
        }
        
        // Add influencing factors
        if (metadata.colorUniformity < 0.6) {
            factors.push('uneven_healing');
        }
        
        if (qualityScore < 60) {
            factors.push('poor_quality_tissue');
        }
        
        return {
            primaryStage,
            progression,
            estimatedTimeToHeal,
            factors
        };
    }

    generateTreatmentRecommendation(severity) {
        const recommendations = {
            'mild': {
                text: 'Clean wound with saline, apply sterile dressing, monitor for signs of infection.',
                urgency: 'routine',
                category: 'basic_care',
                interventions: ['cleaning', 'dressing', 'monitoring']
            },
            'moderate': {
                text: 'Debridement if needed, apply appropriate dressing, consider antibiotics if signs of infection.',
                urgency: 'prompt',
                category: 'intermediate_care',
                interventions: ['debridement', 'dressing', 'infection_control', 'pain_management']
            },
            'severe': {
                text: 'Immediate medical attention required. May need surgical intervention, systemic antibiotics, and specialized wound care.',
                urgency: 'urgent',
                category: 'advanced_care',
                interventions: ['surgical_consultation', 'systemic_antibiotics', 'specialized_dressing', 'pain_management']
            },
            'normal': {
                text: 'Wound appears to be healing normally. Continue current care routine and monitor progress.',
                urgency: 'routine',
                category: 'maintenance',
                interventions: ['monitoring', 'routine_care']
            }
        };
        
        return recommendations[severity] || recommendations.normal;
    }

    generateFollowUpSchedule(severity) {
        const schedules = {
            'mild': {
                text: 'Review in 3-5 days or sooner if signs of infection develop.',
                frequency: '3-5_days',
                duration: '2_weeks',
                monitoring: ['infection_signs', 'healing_progress']
            },
            'moderate': {
                text: 'Review in 2-3 days. Weekly follow-up until improvement noted.',
                frequency: '2-3_days_initial_then_weekly',
                duration: '4_weeks',
                monitoring: ['infection_signs', 'healing_progress', 'pain_level']
            },
            'severe': {
                text: 'Daily review for first week, then every 2-3 days until stable.',
                frequency: 'daily_then_2-3_days',
                duration: '6+_weeks',
                monitoring: ['infection_signs', 'healing_progress', 'pain_level', 'systemic_symptoms']
            },
            'normal': {
                text: 'Routine follow-up in 1 week to ensure continued healing.',
                frequency: '1_week',
                duration: '2_weeks',
                monitoring: ['healing_progress']
            }
        };
        
        return schedules[severity] || schedules.normal;
    }

    assessOverallRisk(context, severity) {
        const qualityScore = context.qualityScore?.total || 0;
        const factors = [];
        const complications = [];
        const prevention = [];
        
        // Risk factors
        if (qualityScore < 60) {
            factors.push('poor_wound_quality');
        }
        
        if (severity === 'severe') {
            factors.push('severe_wound');
            complications.push('chronic_infection', 'delayed_healing');
            prevention.push('specialist_consultation', 'advanced_wound_care');
        }
        
        if (severity === 'moderate') {
            factors.push('moderate_wound');
            complications.push('infection_risk');
            prevention.push('regular_monitoring', 'proper_dressing');
        }
        
        // Determine overall risk level
        let riskLevel = 'low';
        if (factors.length >= 2 || severity === 'severe') {
            riskLevel = 'high';
        } else if (factors.length >= 1 || severity === 'moderate') {
            riskLevel = 'moderate';
        }
        
        return {
            level: riskLevel,
            factors,
            complications,
            prevention
        };
    }

    requiresTreatment(severity) {
        return severity !== 'normal' && severity !== 'healed';
    }

    requiresFollowUp(severity) {
        return severity !== 'healed';
    }

    getUrgency(severity) {
        const urgencyMap = {
            'severe': 'urgent',
            'moderate': 'prompt',
            'mild': 'routine',
            'normal': 'routine',
            'healed': 'none'
        };
        
        return urgencyMap[severity] || 'routine';
    }

    getConceptUuid(conceptName) {
        const conceptMap = {
            'wound_classification': 'uuid-wound-classification',
            'tissue_analysis': 'uuid-tissue-analysis',
            'infection_indicators': 'uuid-infection-indicators',
            'healing_stage': 'uuid-healing-stage',
            'treatment_recommendation': 'uuid-treatment-recommendation',
            'follow_up_schedule': 'uuid-follow-up-schedule',
            'risk_assessment': 'uuid-risk-assessment'
        };
        
        return conceptMap[conceptName] || null;
    }

    getProcessingStats() {
        return {
            ...super.getProcessingStats(),
            features: [
                ...super.getProcessingStats().features,
                'wound_classification',
                'tissue_analysis',
                'infection_assessment',
                'healing_stage_assessment',
                'treatment_recommendations',
                'follow_up_scheduling',
                'risk_assessment'
            ],
            supportedWoundTypes: ['surgical', 'traumatic', 'ulcer', 'burn', 'pressure'],
            severityLevels: ['mild', 'moderate', 'severe', 'normal', 'healed'],
            healingStages: ['inflammatory', 'proliferative', 'maturation', 'chronic']
        };
    }

    getVersion() {
        return '1.0.0';
    }
}

export default WoundSeverityMapper;
