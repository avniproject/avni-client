import {StyleSheet, Switch, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioLabelValue from "../primitives/RadioLabelValue";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import AvniIcon from "../common/AvniIcon";
import Distances from '../primitives/Distances';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import SelectableItemGroup from "../primitives/SelectableItemGroup";
import UserInfoService from "../../service/UserInfoService";
import _ from "lodash";
import {CustomDashboardActionNames, performCustomDashboardActionAndRefresh} from "../../action/customDashboard/CustomDashboardActions";

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

    renderUserPropertyToggleButton(label, propertyName, actionName, iconName, onValueChange = _.noop) {
        const value = this.state.userInfo.getSettings()[propertyName];
        return <View style={styles.toggleSection}>
            <Text style={styles.toggleSectionLabel}>{this.I18n.t(label)}</Text>
            <View style={styles.toggleCard}>
                <View style={styles.toggleIconContainer}>
                    <AvniIcon name={iconName} type='MaterialCommunityIcons' style={styles.toggleIcon}/>
                </View>
                <Text style={styles.toggleLabel}>{this.I18n.t(propertyName)}</Text>
                <Switch value={value}
                        trackColor={{false: Colors.BorderDefault, true: Colors.BrandLight}}
                        thumbColor={value ? Colors.BrandPrimaryDark : Colors.WhiteContentBackground}
                        ios_backgroundColor={Colors.BorderDefault}
                        onValueChange={(value) => {
                            this.dispatchAction(actionName);
                            onValueChange(value);
                        }}/>
            </View>
        </View>
    }

    render() {
        const localeLabelValuePairs = this.state.localeMappings.map((localeMapping) => new RadioLabelValue(localeMapping.displayText, localeMapping));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('settings')}/>
                    <View style={{paddingHorizontal: Distances.ScaledContentDistanceFromEdge}}>
                        {_.isEmpty(this.state.localeMappings) ? <View/> :
                            <View style={{marginTop: 28}}>
                                <SelectableItemGroup
                                    locale={currentLocale}
                                    I18n={this.I18n}
                                    onPress={(value) => this.dispatchAction(Actions.ON_LOCALE_CHANGE, {locale: value.locale})}
                                    labelValuePairs={localeLabelValuePairs}
                                    labelKey='locale'
                                    inPairs={true}
                                    selectionFn={(localeMapping) => this.state.userInfo.getSettings().locale === localeMapping.locale}
                                    validationError={null}
                                    labelMarginBottom={12}
                                />
                            </View>
                        }
                        {this.renderUserPropertyToggleButton('location', 'trackLocation', Actions.ON_CAPTURE_LOCATION_CHANGE, 'crosshairs-gps')}
                        {this.renderUserPropertyToggleButton('autoRefresh', 'disableAutoRefresh', Actions.ON_CAPTURE_AUTO_REFRESH_CHANGE, 'refresh', (disabled) => {
                            performCustomDashboardActionAndRefresh(this, CustomDashboardActionNames.DISABLE_AUTO_REFRESH_VALUE_UPDATED, {disabled});
                        })}
                        {this.renderUserPropertyToggleButton('autoSync', 'disableAutoSync', Actions.ON_CAPTURE_AUTO_SYNC_CHANGE, 'sync')}
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SettingsView;

const styles = StyleSheet.create({
    toggleSection: {
        marginTop: Distances.VerticalSpacingBetweenFormElements
    },
    toggleSectionLabel: {
        ...Styles.formLabel,
        marginBottom: 6
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.WhiteContentBackground,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.BorderDefault,
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    toggleIconContainer: {
        height: 36,
        width: 36,
        borderRadius: 18,
        backgroundColor: Colors.BrandLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    toggleIcon: {
        fontSize: 20,
        color: Colors.BrandPrimaryDark
    },
    toggleLabel: {
        flex: 1,
        color: Colors.TextPrimaryDark,
        fontSize: Styles.normalTextSize
    }
});
