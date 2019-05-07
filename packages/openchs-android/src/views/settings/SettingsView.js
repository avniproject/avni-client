import {Alert, Switch, Text, TouchableNativeFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import _ from "lodash";
import General from "../../utility/General";
import {SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import themes from "../primitives/themes";
import Distances from '../primitives/Distances';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import I18n from 'react-native-i18n';
import {Schema} from 'openchs-models';
import DeviceInfo from 'react-native-device-info';
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {  Rule  } from 'openchs-models';
import EntitySyncStatusView from "../entitysyncstatus/EntitySyncStatusView";
import TypedTransition from "../../framework/routing/TypedTransition";
import EntityQueueService from "../../service/EntityQueueService";
import AuthService from "../../service/AuthService";

@Path('/settingsView')
class SettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.settings);
        this.entityMap = {
            "Individual decisions": ["Individual", Rule.types.Decision],
            "Enrolment decisions": ["ProgramEnrolment", Rule.types.Decision],
            "Encounter decisions": ["Encounter", Rule.types.Decision],
            "Program encounter decisions": ["ProgramEncounter", Rule.types.Decision],
            "Enrolment Visit Schedule": ["ProgramEnrolment", Rule.types.VisitSchedule],
            "Encounter Visit Schedule": ["ProgramEncounter", Rule.types.VisitSchedule]
        };
        this.state = {};
    }

    viewName() {
        return 'SettingsView';
    }

    entitySyncStatusView() {
        TypedTransition.from(this).to(EntitySyncStatusView);
    }

    componentWillMount() {
        this.context.getService(AuthService).getUserName().then(username => {
            this.setState(state => ({...state, username: username}));
        });
        super.componentWillMount();
    }

    forceSync() {
        const entityQueueService = this.context.getService(EntityQueueService);
        entityQueueService.requeueAll();
    }

    onForceSync() {
        Alert.alert(
            this.I18n.t('forceSyncWarning'),
            this.I18n.t('forceSyncWarningMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => this.forceSync()
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                    },
                    style: 'cancel'
                }
            ]
        )
    }

    renderAdvancedOptions() {
        const logLevelLabelValuePairs = _.keys(General.LogLevel).map((logLevelName) => new RadioLabelValue(logLevelName, General.LogLevel[logLevelName]));
        const cb = this.entitySyncStatusView.bind(this);
        return this.state.advancedMode ? (
            <View>
                <RadioGroup
                    onPress={({value}) => this.dispatchAction(Actions.ON_LOG_LEVEL_CHANGE, {value: value})}
                    labelValuePairs={logLevelLabelValuePairs} labelKey='logLevel'
                    selectionFn={(logLevel) => this.state.settings.logLevel === logLevel}
                    validationError={null}
                    style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                <TouchableNativeFeedback onPress={cb}>
                    <View style={Styles.basicPrimaryButtonView}>
                        <Text style={{
                            fontSize: Fonts.Medium,
                            color: Colors.TextOnPrimaryColor
                        }}>{this.I18n.t('entitySyncStatus')}</Text>
                    </View>
                </TouchableNativeFeedback>
            </View>) : (<View/>);
    }

    runRules() {
        this.context.getService(RuleEvaluationService).runOnAll(this.state.rulesToRun);
    }

    renderDevOptions() {
        if (__DEV__) {
            const ruleLevel = Object.entries(this.entityMap)
                .map(([displayName, value]) => new RadioLabelValue(displayName, value));
            return (<View>
                <RadioGroup
                    onPress={({value}) => this.dispatchAction(Actions.ON_RULE_CHANGE, {value: value})}
                    labelValuePairs={ruleLevel}
                    labelKey='Rules to run'
                    selectionFn={(ruleToRun) => this.state.rulesToRun.indexOf(ruleToRun) > -1}
                    validationError={null}
                    multiSelect={true}
                    style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                />
                <TouchableNativeFeedback onPress={() => this.runRules(this.state.rulesToRun)}>
                    <View style={Styles.basicPrimaryButtonView}>
                        <Text style={{
                            fontSize: Fonts.Medium,
                            color: Colors.TextOnPrimaryColor
                        }}>Run {this.state.rulesToRun.length === 0 ? 'All' : 'Selected'} Rules</Text>
                    </View>
                </TouchableNativeFeedback>
            </View>);
        }
    }

    render() {
        const localeLabelValuePairs = this.state.localeMappings.map((localeMapping) => new RadioLabelValue(localeMapping.displayText, localeMapping));
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('settings')}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        <Text style={Styles.settingsTitle}>
                            {this.state.userInfo.organisationName ?
                                this.state.username ?
                                    `${this.state.username} (${this.state.userInfo.organisationName})`
                                    : this.state.userInfo.organisationName
                                : I18n.t('syncRequired')
                            }
                        </Text>
                        <RadioGroup onPress={({value}) => this.dispatchAction(Actions.ON_LOCALE_CHANGE, {locale: value.locale})}
                                    labelValuePairs={localeLabelValuePairs}
                                    labelKey='locale'
                                    selectionFn={(localeMapping) => this.state.userInfo.getSettings().locale === localeMapping.locale}
                                    validationError={null}
                                    style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>

                        <View style={Styles.listContainer}>
                            <Text style={Styles.textList}>Server: <Text
                                style={{color: 'black', fontSize: Styles.normalTextSize}}>{this.state.serverURL}</Text></Text>
                            <Text style={Styles.textList}>Database Schema : <Text
                                style={{color: 'black', fontSize: Styles.normalTextSize}}>{Schema.schemaVersion}</Text></Text>
                            <Text style={Styles.textList}>BuildVersion: <Text
                                style={{color: 'black', fontSize: Styles.normalTextSize}}>{DeviceInfo.getVersion()}</Text></Text>
                        </View>

                        <Text style={Styles.formLabel}>{this.I18n.t('location')}</Text>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: Colors.InputBorderNormal,
                            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems
                        }}>
                            <Text style={{color: 'black', fontSize: Styles.normalTextSize}}>{this.I18n.t('trackLocation')}</Text>
                            <Switch value={this.state.userInfo.getSettings().trackLocation}
                                    onValueChange={() => this.dispatchAction(Actions.ON_CAPTURE_LOCATION_CHANGE)}/>
                        </View>

                        {this.renderDevOptions()}
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Text style={{color: 'black', fontSize: Styles.normalTextSize}}>Advanced Settings</Text>
                            <Switch value={this.state.advancedMode}
                                    onValueChange={() => this.dispatchAction(Actions.ON_ADVANCED_MODE)}/>
                        </View>
                        {this.renderAdvancedOptions()}
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SettingsView;