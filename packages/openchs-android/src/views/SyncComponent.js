import AbstractComponent from "../framework/view/AbstractComponent";
import UserInfoService from "../service/UserInfoService";
import Colors from "./primitives/Colors";
import RuleEvaluationService from "../service/RuleEvaluationService";
import ProgramConfigService from "../service/ProgramConfigService";
import MessageService from "../service/MessageService";
import RuleService from "../service/RuleService";
import {IndividualSearchActionNames as IndividualSearchActions} from "../action/individual/IndividualSearchActions";
import {LandingViewActionsNames as LandingViewActions} from "../action/LandingViewActions";
import {SyncActionNames as SyncActions} from "../action/SyncActions";
import General from "../utility/General";
import {SyncTelemetryActionNames as SyncTelemetryActions} from "../action/SyncTelemetryActions";
import bugsnag from "../utility/bugsnag";
import AuthenticationError from "../service/AuthenticationError";
import CHSNavigator from "../utility/CHSNavigator";
import ServerError from "../service/ServerError";
import {Alert, Dimensions, Modal, NetInfo, Text, View, TouchableNativeFeedback} from "react-native";
import _ from "lodash";
import SyncService from "../service/SyncService";
import {EntityMetaData} from "avni-models";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import React from "react";
import ProgressBarView from "./ProgressBarView";
import Reducers from "../reducer";
import {MyDashboardActionNames} from "../action/mydashboard/MyDashboardActions";
import SettingsService from "../service/SettingsService";
import PrivilegeService from "../service/PrivilegeService";

const {width, height} = Dimensions.get('window');

class SyncComponent extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.syncComponentAction);

        this.createStyles();
    }

    viewName() {
        return "SyncComponent";
    }

    createStyles() {
        this.syncContainerStyle = {
            flex: 1,
            flexDirection: 'column',
            flexWrap: 'nowrap',
            backgroundColor: "rgba(0, 0, 0, 0.5)",
        };
        this.syncBackground = {
            width: width * .7,
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            alignSelf: 'center',
            backgroundColor: Colors.getCode("paperGrey900").color,
        };
    }

    _preSync() {
        this.dispatchAction(SyncActions.PRE_SYNC);
    }

    reset() {
        this.context.getService(RuleEvaluationService).init();
        this.context.getService(ProgramConfigService).init();
        this.context.getService(MessageService).init();
        this.context.getService(RuleService).init();
        this.dispatchAction('RESET');
        this.context.getService(PrivilegeService).deleteRevokedEntities();
        //To load subjectType after sync
        this.dispatchAction(IndividualSearchActions.ON_LOAD);

        //To re-render LandingView after sync
        this.dispatchAction(LandingViewActions.ON_LOAD, {syncRequired: false});
    }

    progressBarUpdate(progress) {
        this.dispatchAction(SyncActions.ON_UPDATE, {progress})
    }

    messageCallBack(message) {
        this.dispatchAction(SyncActions.ON_MESSAGE_CALLBACK, {message})
    }

    _postSync() {
        this.dispatchAction(SyncActions.POST_SYNC);
        setTimeout(() => this.reset(), 1);

        const userInfoService = this.context.getService(UserInfoService);
        const userSettings = userInfoService.getUserSettings();
        this.context.getService(SettingsService).initLanguages();
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error, ignoreBugsnag) {
        General.logError(`${this.viewName()}-Sync`, error);
        this.dispatchAction(SyncTelemetryActions.SYNC_FAILED);
        const isServerError = error instanceof ServerError;
        //Do not notify bugsnag if it's a server error since it would have been notified on server bugsnag already.
        if(!ignoreBugsnag && !isServerError) bugsnag.notify(error);
        this.dispatchAction(SyncActions.ON_ERROR);
        if (error instanceof AuthenticationError && error.authErrCode !== 'NetworkingError') {
            General.logError(this.viewName(), "Could not authenticate");
            General.logError(this.viewName(), error);
            General.logError(this.viewName(), "Redirecting to login view");
            CHSNavigator.navigateToLoginView(this, true, (source) => CHSNavigator.navigateToLandingView(source, true, {
                tabIndex: 1,
                menuProps: {startSync: true}
            }));
        } else {
            const errorMessage = isServerError ? this.I18n.t('syncServerError') : error.message;
            Alert.alert(this.I18n.t("syncError"), errorMessage, [{
                    text: this.I18n.t('tryAgain'),
                    onPress: () => this.sync()
                },
                    {text: this.I18n.t('cancel'), onPress: _.noop, style: 'cancel'},
                ]
            );
        }
    }

    componentWillMount() {
        super.componentWillMount();
    }

    onConnectionChange(isConnected) {
        if (!this.state.syncing) {
            this.dispatchAction(SyncActions.ON_CONNECTION_CHANGE, {isConnected})
        }
    }

    componentDidMount() {
        if (this.props.startSync) {
            this.sync();
        }
        NetInfo.isConnected.addEventListener('connectionChange', this._handleConnectivityChange);
        NetInfo.isConnected.fetch().done((isConnected) => {
            this.onConnectionChange(isConnected)
        });
    }

    _handleConnectivityChange = (isConnected) => {
        this.onConnectionChange(isConnected)
    };

    componentWillUnmount() {
        NetInfo.isConnected.removeEventListener('connectionChange', this._handleConnectivityChange);
    }

    sync() {
        if (this.state.isConnected) {
            const syncService = this.context.getService(SyncService);
            const onError = this._onError.bind(this);
            this._preSync();
            syncService.sync(
                EntityMetaData.model(),
                (progress) => this.progressBarUpdate(progress),
                (message) => this.messageCallBack(message)).catch(onError)
        } else {
            const ignoreBugsnag = true;
            this._onError(new Error('internetConnectionError'), ignoreBugsnag);
        }
    }

    renderSyncModal() {
        return (
            <Modal animationType={'fade'}
                   transparent={true}
                   onRequestClose={_.noop}
                   visible={this.state.syncing}>
                <View style={[this.syncContainerStyle, {backgroundColor: 'rgba(0, 0, 0, 0.25)'}]}
                      key={`spinner_${Date.now()}`}>
                    <View style={{flex: .4}}/>
                    <View style={this.syncBackground}>
                        <View style={{flex: .9}}>
                            <ProgressBarView
                                progress={this.state.progress}
                                message={this.state.message}
                                onPress={this._postSync.bind(this)}/>
                        </View>
                    </View>
                    <View style={{flex: 1}}/>
                </View>
            </Modal>);
    }

    get syncIcon() {
        const icon = this.props.icon("sync", {
            color: Colors.headerIconColor,
            alignSelf: 'center',
            fontSize: 30
        });
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const totalPending = _.sum(entitySyncStatusService.geAllSyncStatus().filter(s => s.entityName !== 'SyncTelemetry').map(s => s.queuedCount));
        return !this.state.syncing && totalPending > 0 ? Badge(totalPending)(icon) : icon;
    }

    render() {
        return (
            <View>
                {this.renderSyncModal()}
                <TouchableNativeFeedback
                    onPress={() => this.sync()}>
                    <View style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        height: 56,
                        width: 72,
                        paddingHorizontal: 16,
                    }}>
                        {this.syncIcon}
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }

}


const Badge = (number) => (icon) => {
    const [height, width, fontSize, paddingLeft] = number > 99 ? [17, 17, 9, 0] : [17, 17, 11, 6];
    return (
        <View style={{
            width: 50,
            height: 49,
            backgroundColor: Colors.headerBackgroundColor,
            flexDirection: 'row',
            justifyContent: 'center',
            alignSelf: 'center'
        }}>
            <View style={{
                height,
                width,
                position: 'absolute',
                top: 1,
                right: 0,
                backgroundColor: 'mediumvioletred',
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Text style={{
                    fontSize,
                    color: 'white',
                    textAlignVertical: 'center',
                    textAlign: 'center'
                }}>{number}</Text>
            </View>
            {icon}
        </View>
    );
};

export default SyncComponent
