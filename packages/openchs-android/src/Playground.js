import React, {Component, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Button} from "react-native";
import RealmFactory from "./framework/db/RealmFactory";
import _ from 'lodash';
import {TextField} from "native-base";
import ServiceContext from "./framework/context/ServiceContext";
import AIObservationFormElement from "./views/form/formElement/AIObservationFormElement";
import MessageService from "./service/MessageService";
import {NativeBaseProvider} from "native-base";
import General from "./utility/General";
import FileSystem from "./model/FileSystem";

async function executeQuery(queryString, type, setOutput) {
    //waitForNotNULL(getDb)
    console.log("executeQuery", queryString);
    setOutput("Preparing db");
    let db = await RealmFactory.createRealm()
    if (db == null) {
        return -1000;
    }
    console.log('db version', db.schemaVersion);

    try {
        setOutput("Executing query");
        let objects = db.objects(type);
        if (!_.isEmpty(queryString))
            objects = objects.filtered(queryString);
        return setOutput(objects.map(_.identity).length);
    } catch (e) {
        console.error(e);
        return setOutput(-1);
    }
}

function QueryAndOutput() {
    const [output, setOutput] = useState("-")
    const [query, setQuery] = useState("")
    const [schema, setSchema] = useState("")

    return <View>
        <View style={{display: "flex", flexDirection: "row"}}>
            <Text>Entity Schema Name</Text>
            <TextInput onChangeText={(text) => setSchema(text)} value={schema} style={{backgroundColor: "grey"}}/>
        </View>

        <View style={{display: "flex", flexDirection: "row"}}>
            <Text>Query</Text>
            <TextInput multiline={true} onChangeText={(text) => setQuery(text)} value={query}  style={{backgroundColor: "grey"}}/>
        </View>
        <Text>{output}</Text>
        <View style={{display: "flex", flexDirection: "row", justifyContent: "space-around"}}>
            <Button onPress={() => executeQuery(query, schema, setOutput)} title="Run"/>
        </View>
        <View style={{marginTop: 20}}>
            <Button onPress={() => {
                setQuery('');
                setOutput('-');
            }} title="CLEAR"/>
        </View>
    </View>
}

function TxQueries() {
    return <QueryAndOutput/>;
}

// ─── AI Form Element Playground ───────────────────────────────────────────────

/**
 * Stub ServiceContext value — no Realm, no Redux, no backend required.
 * - I18n.t() passes keys through as-is
 * - dispatchAction console.logs the dispatched value
 */
const stubI18n = {t: (key) => key};
const stubServiceContext = {
    getService: (Cls) => {
        if (Cls === MessageService) {
            return {getI18n: () => stubI18n};
        }
        return null;
    },
    getStore: () => ({
        dispatch: (action) => {
            console.log('[AI Playground] dispatchAction:', JSON.stringify(action));
        },
        getState: () => ({}),
    }),
    getDB: () => null,
    navigator: () => null,
};

/**
 * Build a minimal Concept plain-object that AIObservationFormElement reads via
 * concept.additionalInfo?.aiConfig  and  concept.datatype.
 */
function makeConcept(uuid, name, datatype, aiConfig) {
    return {
        uuid,
        name,
        datatype,
        additionalInfo: {aiConfig},
        answers: [],
        keyValues: [],
        media: [],
        voided: false,
        isMedia: () => false,
        isCoded: () => false,
    };
}

/**
 * Build a minimal FormElement plain-object.
 * FormElementLabelWithDocumentation reads element.name, element.mandatory,
 * element.concept.  isQuestionGroup() is called by FormElementGroup.
 */
function makeFormElement(uuid, name, concept) {
    return {
        uuid,
        name,
        concept,
        mandatory: false,
        keyValues: [],
        voided: false,
        displayOrder: 1,
        isQuestionGroup: () => false,
        isMultiSelect: () => false,
        durationOptions: [],
        documentation: null,
        groupUuid: null,
    };
}

// ── Placeholder AI configs ────────────────────────────────────────────────────

const HB_AI_CONFIG = {
    enabled: true,
    mediaType: 'image',
    pipeline: {
        preProcessor: 'ConjunctivaPreProcessor',
        processor: 'TFLiteProcessor',
        postProcessor: 'HbObservationMapper',
        processorConfig: {
            modelFile: 'hb_regression_v1.tflite',
            inputShape: [1, 224, 224, 3],
            outputType: 'regression',
            labels: ['hemoglobin'],
            confidenceThreshold: 0.5,
        },
    },
    captureConfig: {showGuide: true},
    outputMapping: [{conceptUuid: 'hb-value-uuid', outputKey: 'hemoglobin'}],
    qualityGates: {allowLowQualityWithWarning: true},
    qualityMetaConcepts: {},
};

const WOUND_AI_CONFIG = {
    enabled: true,
    mediaType: 'image',
    pipeline: {
        preProcessor: 'WoundPreProcessor',
        processor: 'TFLiteProcessor',
        postProcessor: 'WoundSeverityMapper',
        processorConfig: {
            modelFile: 'wound_severity_v1.tflite',
            inputShape: [1, 224, 224, 3],
            outputType: 'classification',
            labels: ['none', 'mild', 'moderate', 'severe'],
            confidenceThreshold: 0.5,
        },
    },
    captureConfig: {showGuide: true},
    outputMapping: [{conceptUuid: 'wound-severity-uuid', outputKey: 'woundSeverity'}],
    qualityGates: {allowLowQualityWithWarning: true},
    qualityMetaConcepts: {},
};

const TRANSCRIPTION_AI_CONFIG = {
    enabled: true,
    mediaType: 'audio',
    pipeline: {
        preProcessor: 'SpeechPreProcessor',
        processor: 'RuleBasedProcessor',
        postProcessor: 'TranscriptionMapper',
    },
    captureConfig: {showGuide: false},
    outputMapping: [{conceptUuid: 'transcription-uuid', outputKey: 'transcription'}],
    qualityGates: {allowLowQualityWithWarning: true},
    qualityMetaConcepts: {},
};

// ── Placeholder form elements per tab ─────────────────────────────────────────

const AI_TABS = [
    {
        key: 'hb',
        label: 'Hemoglobin',
        formElement: makeFormElement(
            'fe-hb-uuid',
            'Hemoglobin (AI)',
            makeConcept('concept-hb-uuid', 'Hemoglobin (AI)', 'Image', HB_AI_CONFIG)
        ),
    },
    {
        key: 'wound',
        label: 'Wound',
        formElement: makeFormElement(
            'fe-wound-uuid',
            'Wound Assessment (AI)',
            makeConcept('concept-wound-uuid', 'Wound Assessment (AI)', 'Image', WOUND_AI_CONFIG)
        ),
    },
    {
        key: 'transcription',
        label: 'Transcription',
        formElement: makeFormElement(
            'fe-transcription-uuid',
            'Audio Transcription (AI)',
            makeConcept('concept-transcription-uuid', 'Audio Transcription (AI)', 'Audio', TRANSCRIPTION_AI_CONFIG)
        ),
    },
];

// ── AIFormPlayground component ────────────────────────────────────────────────

function AIFormPlayground() {
    const [activeTab, setActiveTab] = useState('hb');
    const [lastDispatch, setLastDispatch] = useState(null);

    const activeTabConfig = AI_TABS.find(t => t.key === activeTab);

    const contextWithLogger = {
        ...stubServiceContext,
        getStore: () => ({
            dispatch: (action) => {
                console.log('[AI Playground] dispatchAction:', JSON.stringify(action));
                setLastDispatch(JSON.stringify(action, null, 2));
            },
            getState: () => ({}),
        }),
    };

    return (
        <View style={aiStyles.container}>
            <Text style={aiStyles.sectionTitle}>AI Observation Form Elements</Text>

            {/* Tab bar */}
            <View style={aiStyles.tabBar}>
                {AI_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[aiStyles.tab, activeTab === tab.key && aiStyles.activeTab]}
                        onPress={() => {
                            setActiveTab(tab.key);
                            setLastDispatch(null);
                        }}>
                        <Text style={[aiStyles.tabText, activeTab === tab.key && aiStyles.activeTabText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Active form element */}
            <ServiceContext.Provider value={contextWithLogger}>
                <View style={aiStyles.formArea}>
                    <AIObservationFormElement
                        key={activeTab}
                        element={activeTabConfig.formElement}
                        actionName="AI_OBSERVATION_VALUE_CHANGE"
                        value={null}
                        validationResult={null}
                    />
                </View>
            </ServiceContext.Provider>

            {/* Dispatch log panel */}
            {lastDispatch && (
                <View style={aiStyles.dispatchPanel}>
                    <Text style={aiStyles.dispatchTitle}>Last dispatched value:</Text>
                    <ScrollView style={aiStyles.dispatchScroll}>
                        <Text style={aiStyles.dispatchText}>{lastDispatch}</Text>
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const aiStyles = StyleSheet.create({
    container: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        color: '#333',
    },
    tabBar: {
        flexDirection: 'row',
        marginBottom: 12,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1976D2',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    activeTab: {
        backgroundColor: '#1976D2',
    },
    tabText: {
        fontSize: 13,
        color: '#1976D2',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
    formArea: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 8,
        backgroundColor: '#fafafa',
    },
    dispatchPanel: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
        borderRadius: 6,
        padding: 8,
        backgroundColor: '#F1F8E9',
        maxHeight: 180,
    },
    dispatchTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#388E3C',
        marginBottom: 4,
    },
    dispatchScroll: {
        maxHeight: 140,
    },
    dispatchText: {
        fontSize: 11,
        color: '#1B5E20',
        fontFamily: 'monospace',
    },
});

// ─────────────────────────────────────────────────────────────────────────────

export default class Playground extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            value: "item1"
        };
        General.setCurrentLogLevel(General.LogLevel.Debug);
    }

    componentDidMount() {
        FileSystem.init().catch(e => console.error('[Playground] FileSystem.init failed:', e.message));
    }

    render() {
        console.log("======================================>>>>>>>>>>>>>>>>>>>Rendering playground");
        return (
            <NativeBaseProvider>
                <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 16}}>
                    {/* <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 12}}>Playground</Text> */}
                    {/* <TxQueries/> */}
                    <AIFormPlayground/>
                </ScrollView>
            </NativeBaseProvider>
        );
    }
}
