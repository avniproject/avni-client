import {Switch, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioLabelValue from "../primitives/RadioLabelValue";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import Distances from '../primitives/Distances';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";


@Path('/settingsView')
class SettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.settings);
        this.state = {};
    }

    viewName() {
        return 'SettingsView';
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    renderUserPropertyToggleButton(label, propertyName, actionName) {
        return <View>
            <Text style={Styles.formLabel}>{this.I18n.t(label)}</Text>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: 1,
                borderColor: Colors.InputBorderNormal,
                paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems
            }}>
                <Text style={{
                    color: 'black',
                    fontSize: Styles.normalTextSize
                }}>{this.I18n.t(propertyName)}</Text>
                <Switch value={this.state.userInfo.getSettings()[propertyName]}
                        onValueChange={() => this.dispatchAction(actionName)}/>
            </View>
        </View>
    }

    render() {
        const localeLabelValuePairs = this.state.localeMappings.map((localeMapping) => new RadioLabelValue(localeMapping.displayText, localeMapping));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('settings')}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        {_.isEmpty(this.state.localeMappings) ? <View/> :
                            <SelectableItemGroup
                                locale={currentLocale}
                                I18n={this.I18n}
                                onPress={(value) => this.dispatchAction(Actions.ON_LOCALE_CHANGE, {locale: value.locale})}
                                labelValuePairs={localeLabelValuePairs}
                                labelKey='locale'
                                inPairs={true}
                                selectionFn={(localeMapping) => this.state.userInfo.getSettings().locale === localeMapping.locale}
                                validationError={null}
                                style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}
                            />
                        }
                        {this.renderUserPropertyToggleButton('location', 'trackLocation', Actions.ON_CAPTURE_LOCATION_CHANGE)}
                        {this.renderUserPropertyToggleButton('autoRefresh', 'disableAutoRefresh', Actions.ON_CAPTURE_AUTO_REFRESH_CHANGE)}
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SettingsView;
