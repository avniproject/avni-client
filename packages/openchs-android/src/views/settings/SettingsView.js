import {View, Text} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import _ from "lodash";
import General from "../../utility/General";
import {SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import StaticFormElement from "../viewmodel/StaticFormElement";
import Reducers from "../../reducer";
import TextFormElement from "../form/formElement/TextFormElement";
import AppHeader from "../common/AppHeader";
import themes from "../primitives/themes";
import Distances from '../primitives/Distances';
import {PrimitiveValue} from "openchs-models";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";

@Path('/settingsView')
class SettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.settings);
    }

    viewName() {
        return 'SettingsView';
    }

    render() {
        const localeLabelValuePairs = this.state.localeMappings.map((localeMapping) => new RadioLabelValue(localeMapping.displayText, localeMapping));
        const logLevelLabelValuePairs = _.keys(General.LogLevel).map((logLevelName) => new RadioLabelValue(logLevelName, General.LogLevel[logLevelName]));
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('settings')}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        <Text style={Styles.settingsTitle}>
                            {`${this.state.userInfo.organisationName} - Catchment ${this.state.settings.catchment}`}
                        </Text>
                        <RadioGroup onPress={({value}) => this.dispatchAction(Actions.ON_LOCALE_CHANGE, {value: value})}
                                    labelValuePairs={localeLabelValuePairs} labelKey='locale'
                                    selectionFn={(localeMapping) => this.state.settings.locale.uuid === localeMapping.uuid}
                                    validationError={null}
                                    style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                        <RadioGroup
                            onPress={({value}) => this.dispatchAction(Actions.ON_LOG_LEVEL_CHANGE, {value: value})}
                            labelValuePairs={logLevelLabelValuePairs} labelKey='logLevel'
                            selectionFn={(logLevel) => this.state.settings.logLevel === logLevel}
                            validationError={null}
                            style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SettingsView;