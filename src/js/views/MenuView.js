import {Alert, Animated, Text, View, Dimensions} from "react-native";
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from 'lodash';
import Path from "../framework/routing/Path";
import {Button} from "native-base";
import Icon from 'react-native-vector-icons/MaterialIcons';
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import EntityMetaData from "../models/EntityMetaData";
import EntityService from "../service/EntityService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import DynamicGlobalStyles from "../views/primitives/DynamicGlobalStyles";
import DashboardView from "./program/DashboardView";
import Colors from "./primitives/Colors";
import CHSNavigator from "../utility/CHSNavigator";
import RuleEvaluationService from "../service/RuleEvaluationService";
import General from "../utility/General";
import ProgramConfigService from "../service/ProgramConfigService";
import CHSContent from "./common/CHSContent";
import Styles from "./primitives/Styles";
import * as Animatable from 'react-native-animatable';

@Path('/menuView')
class MenuView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
        this.createStyles();
    }

    viewName() {
        return "MenuView";
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 48};

    createStyles() {
        this.columnStyle = {
            marginHorizontal: DynamicGlobalStyles.resizeWidth(29),
            alignItems: 'center',
            marginTop: DynamicGlobalStyles.resizeWidth(71),
            flexDirection: 'column'
        };
    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    registrationView() {
        CHSNavigator.navigateToIndividualRegisterView(this);
    }

    _preSync() {
        this.setState({syncing: true, error: false});
    }

    _postSync() {
        this.context.getService(RuleEvaluationService).init();
        this.context.getService(ProgramConfigService).init();
        this.dispatchAction('RESET');
        this.setState({syncing: false, error: false});
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error) {
        General.logError(this.viewName(), `Error happened during sync: ${error}`);
        this.setState({syncing: false});
        Alert.alert("Sync Failed", error.message, [{
                text: 'Try Again',
                onPress: () => this.sync()
            },
                {text: 'Cancel', onPress: _.noop, style: 'cancel'},
            ]
        );
    }

    sync() {
        try {
            const syncService = this.context.getService(SyncService);
            syncService.sync(EntityMetaData.model(), this._preSync.bind(this), this._postSync.bind(this), this._onError.bind(this));
        } catch (e) {
            this._onError(e);
        }
    }

    renderSyncButton() {
        return this.state.syncing ?
            (<Animatable.View iterationCount="infinite" duration={2000} animation="rotate">
                <Icon name="sync" style={MenuView.iconStyle}/>
            </Animatable.View>) : (<Icon name="sync" style={MenuView.iconStyle}/>);

    }

    onDeleteSchema = () => {
        const service = this.context.getService(EntityService);
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        Alert.alert(
            this.I18n.t('deleteSchemaNoticeTitle'),
            this.I18n.t('deleteSchemaConfirmationMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                    service.clearDataIn(EntityMetaData.entitiesLoadedFromServer());
                    entitySyncStatusService.setup(EntityMetaData.model());
                }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                },
                    style: 'cancel'
                }
            ]
        )
    };

    renderMenuItem(iconName, menuMessageKey, pressHandler) {
        return (<View style={this.columnStyle}>
                <Button style={{alignSelf: 'center'}} onPress={pressHandler} transparent large>
                    <Icon name={iconName} style={MenuView.iconStyle}/>
                </Button>
                <Text style={Styles.menuTitle}>{menuMessageKey}</Text>
            </View>
        );
    }

    render() {
        return (
            <CHSContent>
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                    height: Dimensions.get('window').height, backgroundColor: Styles.defaultBackground
                }}>
                    <View style={this.columnStyle}>
                        <Button transparent large onPress={this.sync.bind(this)} style={{justifyContent: 'center'}}>
                            {this.renderSyncButton()}
                        </Button>
                        <Text style={Styles.menuTitle}>Sync Data</Text>
                    </View>
                    {this.renderMenuItem('settings', 'Settings', () => this.settingsView())}
                    {this.renderMenuItem('delete', 'Delete Data', () => this.onDeleteSchema())}
                    {this.renderMenuItem('person-add', 'Register', () => this.registrationView())}
                    {this.renderMenuItem('view-list', 'Program Summary', () => TypedTransition.from(this).to(DashboardView))}
                </View>
            </CHSContent>
        );
    }
}

export default MenuView;
