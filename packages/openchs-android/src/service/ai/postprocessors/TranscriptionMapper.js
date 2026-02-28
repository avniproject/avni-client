// @flow
import ObservationMapper from './ObservationMapper';
import General from "../../../utility/General";

/**
 * TranscriptionMapper - Specialized mapper for audio transcription observations.
 * Maps speech-to-text output to AVNI observations with transcription-specific enrichments.
 */
class TranscriptionMapper extends ObservationMapper {
    constructor() {
        super();
    }

    /**
     * Map transcription output to observations with transcription-specific logic
     * @param {PipelineContext} context - The pipeline context
     * @returns {Promise<Observation[]>} Array of observations
     */
    async mapToObservations(context) {
        // Get base observations from generic mapper
        const baseObservations = await super.mapToObservations(context);
        
        // Add transcription-specific enrichments
        const enrichedObservations = await this.addTranscriptionEnrichments(context, baseObservations);
        
        // Add language and confidence analysis
        const analyzedObservations = await this.addLanguageAnalysis(context, enrichedObservations);
        
        General.logDebug('TranscriptionMapper', `Created ${analyzedObservations.length} transcription observations`);
        
        return analyzedObservations;
    }

    /**
     * Add transcription-specific enrichments to observations
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Base observations
     * @returns {Promise<Observation[]>} Enriched observations
     */
    async addTranscriptionEnrichments(context, observations) {
        const enrichedObservations = [...observations];
        const rawOutput = context.rawInferenceOutput;
        
        try {
            // Add transcription confidence
            if (rawOutput.confidence !== undefined) {
                const confidenceObs = this.createTranscriptionConfidenceObservation(context, rawOutput.confidence);
                if (confidenceObs) {
                    enrichedObservations.push(confidenceObs);
                }
            }
            
            // Add word-level timing if available
            if (rawOutput.wordTimings) {
                const timingObs = this.createWordTimingObservation(context, rawOutput.wordTimings);
                if (timingObs) {
                    enrichedObservations.push(timingObs);
                }
            }
            
            // Add alternative transcriptions
            if (rawOutput.alternatives && rawOutput.alternatives.length > 0) {
                const alternativesObs = this.createAlternativesObservation(context, rawOutput.alternatives);
                if (alternativesObs) {
                    enrichedObservations.push(alternativesObs);
                }
            }
            
            // Add audio quality metrics
            const audioQualityObs = this.createAudioQualityObservation(context);
            if (audioQualityObs) {
                enrichedObservations.push(audioQualityObs);
            }
            
        } catch (error) {
            General.logWarn('TranscriptionMapper', `Failed to add transcription enrichments: ${error.message}`);
        }
        
        return enrichedObservations;
    }

    /**
     * Add language and confidence analysis
     * @param {PipelineContext} context - Pipeline context
     * @param {Observation[]} observations - Enriched observations
     * @returns {Promise<Observation[]>} Observations with language analysis
     */
    async addLanguageAnalysis(context, observations) {
        const analyzedObservations = [...observations];
        
        try {
            // Find transcription text observation
            const transcriptionObs = observations.find(obs => 
                obs.concept.name.toLowerCase().includes('transcription') || 
                obs.concept.name.toLowerCase().includes('text')
            );
            
            if (transcriptionObs && typeof transcriptionObs.getValue() === 'string') {
                const transcriptionText = transcriptionObs.getValue();
                
                // Add language detection
                const languageObs = this.createLanguageDetectionObservation(context, transcriptionText);
                if (languageObs) {
                    analyzedObservations.push(languageObs);
                }
                
                // Add text analysis
                const textAnalysisObs = this.createTextAnalysisObservation(context, transcriptionText);
                if (textAnalysisObs) {
                    analyzedObservations.push(textAnalysisObs);
                }
                
                // Add content classification
                const contentObs = this.createContentClassificationObservation(context, transcriptionText);
                if (contentObs) {
                    analyzedObservations.push(contentObs);
                }
                
                // Update transcription observation with metadata
                this.updateTranscriptionObservation(transcriptionObs, context);
            }
            
        } catch (error) {
            General.logWarn('TranscriptionMapper', `Failed to add language analysis: ${error.message}`);
        }
        
        return analyzedObservations;
    }

    /**
     * Create transcription confidence observation
     * @param {PipelineContext} context - Pipeline context
     * @param {number} confidence - Transcription confidence
     * @returns {Observation|null} Confidence observation
     */
    createTranscriptionConfidenceObservation(context, confidence) {
        const conceptUuid = this.getConceptUuid('transcription_confidence');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        return this.createObservation(
            {
                dataType: 'Numeric',
                metadata: {
                    scale: '0-1',
                    interpretation: this.interpretConfidence(confidence),
                    quality: this.assessConfidenceQuality(confidence)
                }
            },
            confidence,
            concept
        );
    }

    /**
     * Create word timing observation
     * @param {PipelineContext} context - Pipeline context
     * @param {Array} wordTimings - Word timing data
     * @returns {Observation|null} Word timing observation
     */
    createWordTimingObservation(context, wordTimings) {
        const conceptUuid = this.getConceptUuid('word_timing');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const timingData = {
            wordCount: wordTimings.length,
            totalDuration: this.calculateTotalDuration(wordTimings),
            averageWordDuration: this.calculateAverageWordDuration(wordTimings),
            speakingRate: this.calculateSpeakingRate(wordTimings, context.mediaMetadata?.duration || 0)
        };
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: timingData
            },
            JSON.stringify(wordTimings),
            concept
        );
    }

    /**
     * Create alternatives observation
     * @param {PipelineContext} context - Pipeline context
     * @param {Array} alternatives - Alternative transcriptions
     * @returns {Observation|null} Alternatives observation
     */
    createAlternativesObservation(context, alternatives) {
        const conceptUuid = this.getConceptUuid('transcription_alternatives');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const alternativesData = alternatives.map((alt, index) => ({
            rank: index + 1,
            text: alt.text,
            confidence: alt.confidence,
            difference: alt.difference || 'unknown'
        }));
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: {
                    alternativeCount: alternatives.length,
                    topAlternative: alternatives[0]?.text,
                    confidenceSpread: this.calculateConfidenceSpread(alternatives)
                }
            },
            JSON.stringify(alternativesData),
            concept
        );
    }

    /**
     * Create audio quality observation
     * @param {PipelineContext} context - Pipeline context
     * @returns {Observation|null} Audio quality observation
     */
    createAudioQualityObservation(context) {
        const conceptUuid = this.getConceptUuid('audio_quality');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const metadata = context.mediaMetadata || {};
        const qualityScore = context.qualityScore?.total || 0;
        
        const qualityData = {
            overallScore: qualityScore,
            rmsLevel: metadata.rmsLevel || 0,
            peakLevel: metadata.peakLevel || 0,
            dynamicRange: metadata.dynamicRange || 0,
            silenceRatio: metadata.silenceRatio || 0,
            snr: metadata.snr || 0,
            quality: this.assessAudioQuality(qualityScore)
        };
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: qualityData
            },
            qualityData.quality,
            concept
        );
    }

    /**
     * Create language detection observation
     * @param {PipelineContext} context - Pipeline context
     * @param {string} text - Transcription text
     * @returns {Observation|null} Language observation
     */
    createLanguageDetectionObservation(context, text) {
        const conceptUuid = this.getConceptUuid('detected_language');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const detectedLanguage = this.detectLanguage(text);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    textLength: text.length,
                    wordCount: text.split(/\s+/).length,
                    confidence: detectedLanguage.confidence,
                    alternatives: detectedLanguage.alternatives
                }
            },
            detectedLanguage.language,
            concept
        );
    }

    /**
     * Create text analysis observation
     * @param {PipelineContext} context - Pipeline context
     * @param {string} text - Transcription text
     * @returns {Observation|null} Text analysis observation
     */
    createTextAnalysisObservation(context, text) {
        const conceptUuid = this.getConceptUuid('text_analysis');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const analysis = this.analyzeText(text);
        
        return this.createObservation(
            {
                dataType: 'Text',
                metadata: analysis
            },
            JSON.stringify(analysis),
            concept
        );
    }

    /**
     * Create content classification observation
     * @param {PipelineContext} context - Pipeline context
     * @param {string} text - Transcription text
     * @returns {Observation|null} Content classification observation
     */
    createContentClassificationObservation(context, text) {
        const conceptUuid = this.getConceptUuid('content_classification');
        if (!conceptUuid) return null;
        
        const concept = this.getConceptByUuid(conceptUuid);
        if (!concept) return null;
        
        const classification = this.classifyContent(text);
        
        return this.createObservation(
            {
                dataType: 'Coded',
                metadata: {
                    categories: classification.categories,
                    confidence: classification.confidence,
                    keywords: classification.keywords
                }
            },
            classification.primaryCategory,
            concept
        );
    }

    /**
     * Update transcription observation with metadata
     * @param {Observation} transcriptionObs - Transcription observation
     * @param {PipelineContext} context - Pipeline context
     */
    updateTranscriptionObservation(transcriptionObs, context) {
        transcriptionObs.metadata = {
            ...transcriptionObs.metadata,
            transcription: {
                duration: context.mediaMetadata?.duration || 0,
                wordCount: transcriptionObs.getValue().split(/\s+/).length,
                characterCount: transcriptionObs.getValue().length,
                processor: context.processorMetadata?.processorName,
                quality: context.qualityScore?.tier,
                timestamp: new Date().toISOString()
            }
        };
    }

    // Helper methods

    interpretConfidence(confidence) {
        if (confidence >= 0.9) return 'very_high';
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.7) return 'moderate';
        if (confidence >= 0.6) return 'low';
        return 'very_low';
    }

    assessConfidenceQuality(confidence) {
        if (confidence >= 0.8) return 'excellent';
        if (confidence >= 0.7) return 'good';
        if (confidence >= 0.6) return 'fair';
        return 'poor';
    }

    calculateTotalDuration(wordTimings) {
        if (wordTimings.length === 0) return 0;
        const lastWord = wordTimings[wordTimings.length - 1];
        return (lastWord.endTime || lastWord.start + lastWord.duration || 0);
    }

    calculateAverageWordDuration(wordTimings) {
        if (wordTimings.length === 0) return 0;
        const totalDuration = wordTimings.reduce((sum, word) => sum + (word.duration || 0), 0);
        return totalDuration / wordTimings.length;
    }

    calculateSpeakingRate(wordTimings, totalDuration) {
        if (totalDuration === 0) return 0;
        const wordsPerMinute = (wordTimings.length / totalDuration) * 60;
        return Math.round(wordsPerMinute);
    }

    calculateConfidenceSpread(alternatives) {
        if (alternatives.length < 2) return 0;
        const confidences = alternatives.map(alt => alt.confidence || 0);
        const max = Math.max(...confidences);
        const min = Math.min(...confidences);
        return max - min;
    }

    detectLanguage(text) {
        // Simple language detection based on common words
        const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
        const hindiWords = ['है', 'और', 'में', 'के', 'से', 'पर', 'की', 'हैं', 'को', 'ने'];
        
        const words = text.toLowerCase().split(/\s+/);
        const englishCount = words.filter(word => englishWords.includes(word)).length;
        const hindiCount = words.filter(word => hindiWords.some(hw => word.includes(hw))).length;
        
        if (englishCount > hindiCount) {
            return { language: 'english', confidence: englishCount / words.length, alternatives: ['hindi'] };
        } else if (hindiCount > 0) {
            return { language: 'hindi', confidence: hindiCount / words.length, alternatives: ['english'] };
        } else {
            return { language: 'unknown', confidence: 0, alternatives: ['english', 'hindi'] };
        }
    }

    analyzeText(text) {
        return {
            characterCount: text.length,
            wordCount: text.split(/\s+/).length,
            sentenceCount: text.split(/[.!?]+/).length - 1,
            averageWordLength: text.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).length,
            hasNumbers: /\d/.test(text),
            hasPunctuation: /[.,!?;:]/.test(text),
            readabilityScore: this.calculateReadabilityScore(text)
        };
    }

    classifyContent(text) {
        const medicalKeywords = ['patient', 'medicine', 'doctor', 'treatment', 'symptom', 'diagnosis', 'fever', 'pain'];
        const generalKeywords = ['hello', 'thank', 'please', 'sorry', 'good', 'bad', 'yes', 'no'];
        
        const words = text.toLowerCase().split(/\s+/);
        const medicalCount = words.filter(word => medicalKeywords.some(kw => word.includes(kw))).length;
        const generalCount = words.filter(word => generalKeywords.some(kw => word.includes(kw))).length;
        
        let primaryCategory = 'general';
        let confidence = 0.5;
        const categories = ['general'];
        const keywords = [];
        
        if (medicalCount > generalCount) {
            primaryCategory = 'medical';
            confidence = medicalCount / words.length;
            categories.push('medical');
            keywords.push(...words.filter(word => medicalKeywords.some(kw => word.includes(kw))));
        } else if (generalCount > 0) {
            confidence = generalCount / words.length;
            keywords.push(...words.filter(word => generalKeywords.some(kw => word.includes(kw))));
        }
        
        return { primaryCategory, confidence, categories, keywords };
    }

    calculateReadabilityScore(text) {
        // Simple readability score based on average word length and sentence length
        const words = text.split(/\s+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (words.length === 0 || sentences.length === 0) return 0;
        
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
        const avgSentenceLength = words.length / sentences.length;
        
        // Simple score: higher is more readable
        return Math.max(0, 100 - (avgWordLength * 2 + avgSentenceLength));
    }

    assessAudioQuality(qualityScore) {
        if (qualityScore >= 80) return 'excellent';
        if (qualityScore >= 60) return 'good';
        if (qualityScore >= 40) return 'fair';
        return 'poor';
    }

    getConceptUuid(conceptName) {
        const conceptMap = {
            'transcription_confidence': 'uuid-transcription-confidence',
            'word_timing': 'uuid-word-timing',
            'transcription_alternatives': 'uuid-transcription-alternatives',
            'audio_quality': 'uuid-audio-quality',
            'detected_language': 'uuid-detected-language',
            'text_analysis': 'uuid-text-analysis',
            'content_classification': 'uuid-content-classification'
        };
        
        return conceptMap[conceptName] || null;
    }

    getProcessingStats() {
        return {
            ...super.getProcessingStats(),
            features: [
                ...super.getProcessingStats().features,
                'transcription_confidence',
                'word_timing_analysis',
                'alternative_transcriptions',
                'language_detection',
                'text_analysis',
                'content_classification',
                'audio_quality_metrics'
            ],
            supportedLanguages: ['english', 'hindi', 'unknown'],
            supportedAudioFormats: ['wav', 'mp3', 'm4a', 'aac']
        };
    }

    getVersion() {
        return '1.0.0';
    }
}

export default TranscriptionMapper;
