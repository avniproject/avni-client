import {Text, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import _ from "lodash";
import General from "../../utility/General";
import {SettingsActionsNames as Actions} from "../../action/SettingsActions";
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
        return 'DevSettingsView';
    }

    componentWillMount() {
        super.componentWillMount();
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
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={'Dev Settings'}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        {this.renderDevOptions()}
                        {this.renderLogLevels()}
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default DevSettingsView;
