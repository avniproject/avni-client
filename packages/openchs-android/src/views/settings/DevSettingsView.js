import {Text, TouchableNativeFeedback, View, TextInput, ScrollView} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import _ from "lodash";
import General from "../../utility/General";
import {SettingsActionsNames, SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import Distances from '../primitives/Distances';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Rule} from 'openchs-models';

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
        return <View>
            <RadioGroup
                onPress={({value}) => this.dispatchAction(Actions.ON_LOG_LEVEL_CHANGE, {value: value})}
                labelValuePairs={logLevelLabelValuePairs} labelKey='logLevel'
                selectionFn={(logLevel) => this.state.settings.logLevel === logLevel}
                validationError={null}
                style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
        </View>;
    }

    runRules() {
        this.context.getService(RuleEvaluationService).runOnAll(this.state.rulesToRun.map((r) => [r.name, r.rule]));
    }

    renderDevOptions() {
        if (__DEV__) {
            const {rulesToRun, settings} = this.state;
            const labelValues = Object.entries(this.entityMap)
                .map(([displayName, value]) => new RadioLabelValue(displayName, value));
            return (<View>
                <RadioGroup
                    onPress={({value}) => this.dispatchAction(Actions.ON_RULE_CHANGE, {value: value})}
                    labelValuePairs={labelValues}
                    labelKey='Rules to run'
                    selectionFn={(ruleToRun) => rulesToRun.indexOf(ruleToRun) > -1}
                    validationError={null}
                    multiSelect={true}
                    style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                />
                <TouchableNativeFeedback onPress={() => this.runRules(rulesToRun)}>
                    <View style={Styles.basicPrimaryButtonView}>
                        <Text style={{
                            fontSize: Fonts.Medium,
                            color: Colors.TextOnPrimaryColor
                        }}>Run {rulesToRun.length === 0 ? 'All' : 'Selected'} Rules</Text>
                    </View>
                </TouchableNativeFeedback>
                <View style={{marginTop: 20}}>
                    <Text>Server URL:</Text>
                    <TextInput value={settings.serverURL} onChangeText={(text) => this.dispatchAction(Actions.ON_SERVER_URL_CHANGE, {value: text})}/>
                </View>
            </View>);
        }
    }

    render() {
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={'Dev Settings'}/>
                    <ScrollView style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        {this.renderDevOptions()}
                        {this.renderLogLevels()}
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default DevSettingsView;
