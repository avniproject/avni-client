import {Text, TouchableNativeFeedback, View, TextInput, ScrollView, StyleSheet} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import _ from "lodash";
import General from "../../utility/General";
import {SettingsActionsNames, SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioLabelValue from "../primitives/RadioLabelValue";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import Distances from '../primitives/Distances';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Rule} from 'openchs-models';
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";
import moment from "moment";
import DashboardCacheService from "../../service/DashboardCacheService";
import {MyDashboardActionNames} from "../../action/mydashboard/MyDashboardActions";
import CustomDashboardCacheService from "../../service/CustomDashboardCacheService";

@Path('/devSettingsView')
class DevSettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.settings);
        this.entityMap = {
            "Individual decisions": {name: "Individual", rule: Rule.types.Decision},
            "Enrolment decisions": {name: "ProgramEnrolment", rule: Rule.types.Decision},
            "Encounter decisions": {name: "Encounter", rule: Rule.types.Decision},
            "Program encounter decisions": {name: "ProgramEncounter", rule: Rule.types.Decision},
            "Enrolment Visit Schedule": {name: "ProgramEnrolment", rule: Rule.types.VisitSchedule},
            "Encounter Visit Schedule": {name: "ProgramEncounter", rule: Rule.types.VisitSchedule}
        };
        this.state = {};
    }

    viewName() {
        return 'DevSettingsView';
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    renderLogLevels() {
        const logLevelLabelValuePairs = _.keys(General.LogLevel).map((logLevelName) => new RadioLabelValue(logLevelName, General.LogLevel[logLevelName]));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return <View style={styles.card}>
            <Text style={styles.cardTitle}>Log Level</Text>
            <SelectableItemGroup
                locale={currentLocale}
                I18n={this.I18n}
                onPress={(value) => this.dispatchAction(Actions.ON_LOG_LEVEL_CHANGE, {value: value})}
                selectionFn={(logLevel) => this.state.settings.logLevel === logLevel}
                validationError={null}
                labelValuePairs={logLevelLabelValuePairs}
                labelKey='logLevel'
                style={{marginTop: 4}}
            />
        </View>;
    }

    runRules() {
        this.context.getService(RuleEvaluationService).runOnAll(this.state.rulesToRun.map((r) => [r.name, r.rule]));
    }

    clearDashboardCache() {
        this.context.getService(DashboardCacheService).clear();
        this.context.getService(CustomDashboardCacheService).resetAllDashboards();
        this.dispatchAction(MyDashboardActionNames.ON_LOAD, {fetchFromDB: true});
    }

    renderDevOptions() {
        if (__DEV__) {
            const {rulesToRun, settings} = this.state;
            const labelValues = Object.entries(this.entityMap)
                .map(([displayName, value]) => new RadioLabelValue(displayName, value));
            const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
            return (<View>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Rules to run</Text>
                    <SelectableItemGroup
                        locale={currentLocale}
                        I18n={this.I18n}
                        onPress={(value) => this.dispatchAction(Actions.ON_RULE_CHANGE, {value: value})}
                        labelValuePairs={labelValues}
                        labelKey='Rules to run'
                        selectionFn={(ruleToRun) => rulesToRun.indexOf(ruleToRun) > -1}
                        validationError={null}
                        multiSelect={true}
                        style={{marginTop: 4}}
                    />
                    <TouchableNativeFeedback onPress={() => this.runRules(rulesToRun)}>
                        <View style={[styles.primaryButton, {marginTop: 16}]}>
                            <Text style={styles.primaryButtonText}>Run {rulesToRun.length === 0 ? 'All' : 'Selected'} Rules</Text>
                        </View>
                    </TouchableNativeFeedback>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Server URL</Text>
                    <TextInput style={styles.textInput}
                               value={settings.serverURL}
                               underlineColorAndroid={'transparent'}
                               placeholderTextColor={Colors.TextHint}
                               onChangeText={(text) => this.dispatchAction(Actions.ON_SERVER_URL_CHANGE, {value: text})}/>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Current App Time</Text>
                    <Text style={styles.cardValue}>{moment().format("DD MMM YYYY hh:mm a")}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Dashboard Cache</Text>
                    <Text style={styles.cardHint}>App restart required after clearing.</Text>
                    <TouchableNativeFeedback onPress={() => this.clearDashboardCache()}>
                        <View style={[styles.primaryButton, {marginTop: 12}]}>
                            <Text style={styles.primaryButtonText}>Clear Dashboard Cache</Text>
                        </View>
                    </TouchableNativeFeedback>
                </View>
            </View>);
        }
    }

    render() {
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <CHSContent>
                    <AppHeader title={'Dev Settings'}/>
                    <ScrollView style={{backgroundColor: Colors.GreyContentBackground}}
                                contentContainerStyle={styles.scrollContent}>
                        {this.renderDevOptions()}
                        {this.renderLogLevels()}
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: Distances.ContentDistanceFromEdge,
        paddingTop: 16,
        paddingBottom: 32
    },
    card: {
        backgroundColor: Colors.WhiteContentBackground,
        borderWidth: 1,
        borderColor: Colors.BorderDefault,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
    },
    cardTitle: {
        fontSize: Fonts.Medium,
        fontWeight: '600',
        color: Colors.TextPrimaryDark,
        marginBottom: 4
    },
    cardValue: {
        fontSize: Fonts.Normal,
        color: Colors.TextPrimaryDark,
        marginTop: 8
    },
    cardHint: {
        fontSize: Fonts.Small,
        color: Colors.TextSecondary,
        marginTop: 4
    },
    textInput: {
        marginTop: 12,
        height: 48,
        borderWidth: 1,
        borderColor: Colors.TextHint,
        borderRadius: 4,
        paddingHorizontal: 12,
        color: Colors.TextPrimaryDark
    },
    primaryButton: {
        minHeight: 48,
        borderRadius: 8,
        backgroundColor: Colors.BrandPrimaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16
    },
    primaryButtonText: {
        fontSize: Fonts.Medium,
        color: Colors.TextOnPrimaryColor,
        fontWeight: '600'
    }
});

export default DevSettingsView;
