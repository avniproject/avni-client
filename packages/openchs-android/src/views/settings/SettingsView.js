import {Alert, Switch, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {SettingsActionsNames as Actions} from "../../action/SettingsActions";
import RadioGroup, {RadioLabelValue} from "../primitives/RadioGroup";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import Distances from '../primitives/Distances';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import I18n from 'react-native-i18n';
import {Schema} from 'openchs-models';
import DeviceInfo from 'react-native-device-info';
import Colors from "../primitives/Colors";
import EntityQueueService from "../../service/EntityQueueService";


@Path('/settingsView')
class SettingsView extends AbstractComponent {
    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.settings);
        this.state = {};
    }

    viewName() {
        return 'SettingsView';
    }

    componentWillMount() {
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

    render() {
        const localeLabelValuePairs = this.state.localeMappings.map((localeMapping) => new RadioLabelValue(localeMapping.displayText, localeMapping));
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('settings')}/>
                    <View style={{paddingHorizontal: Distances.ContentDistanceFromEdge}}>
                        <Text style={Styles.settingsTitle}>
                            {this.state.userInfo.organisationName ?
                                this.state.userInfo.username ?
                                    `${this.state.userInfo.username} (${this.state.userInfo.organisationName})`
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
                            borderRadius: 1,
                            borderColor: Colors.InputBorderNormal,
                            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
                            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems
                        }}>
                            <Text style={{color: 'black', fontSize: Styles.normalTextSize}}>{this.I18n.t('trackLocation')}</Text>
                            <Switch value={this.state.userInfo.getSettings().trackLocation}
                                    onValueChange={() => this.dispatchAction(Actions.ON_CAPTURE_LOCATION_CHANGE)}/>
                        </View>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default SettingsView;
