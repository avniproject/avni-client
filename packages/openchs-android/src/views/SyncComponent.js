import AbstractComponent from "../framework/view/AbstractComponent";
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
import {Alert, Text, TouchableNativeFeedback, View} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import _ from "lodash";
import SyncService from "../service/SyncService";
import {EntityMetaData, SyncError} from "avni-models";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import React from "react";
import ProgressBarView from "./ProgressBarView";
import Reducers from "../reducer";
import SettingsService from "../service/SettingsService";
import PrivilegeService from "../service/PrivilegeService";
import AsyncAlert from "./common/AsyncAlert";
import {ScheduleDummySyncJob, ScheduleSyncJob} from "../AvniBackgroundJob";

class SyncComponent extends AbstractComponent {
    unsubscribe;

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.syncComponentAction);
        this.state = {syncStarted: false};
    }

    viewName() {
        return "SyncComponent";
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
        this.setState({syncStarted: false});
        this.dispatchAction(SyncActions.POST_SYNC);
        setTimeout(() => this.reset(), 1);

        this.context.getService(SettingsService).initLanguages();
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error, ignoreBugsnag) {
        General.logError(`${this.viewName()}-Sync`, error);
        this.setState({syncStarted: false});
        this.dispatchAction(SyncTelemetryActions.SYNC_FAILED);
        const isServerError = error instanceof ServerError;
        //Do not notify bugsnag if it's a server error since it would have been notified on server bugsnag already.
        if (!ignoreBugsnag && !isServerError) bugsnag.notify(error);
        this.dispatchAction(SyncActions.ON_ERROR);
        if (error instanceof AuthenticationError && error.authErrCode !== 'NetworkingError') {
            General.logError(this.viewName(), "Could not authenticate");
            General.logError(this.viewName(), error);
            General.logError(this.viewName(), "Redirecting to login view");
            CHSNavigator.navigateToLoginView(this, true, (source) => CHSNavigator.navigateToLandingView(source, true, {
                tabIndex: 1,
                menuProps: {startSync: true}
            }));
        } else if (!this.state.isConnected) {
            this.ErrorAlert(this.I18n.t('internetConnectionError'));
        } else if (isServerError) {
            error.errorText.then(errorMessage => this.ErrorAlert(errorMessage, error.errorCode));
        } else if (error instanceof SyncError) {
            this.ErrorAlert(error.errorText, error.errorCode)
        } else {
            const errorMessage = error.message || "Unknown error occurred";
            this.ErrorAlert(errorMessage);
        }
    }

    ErrorAlert(errorMessage, errorCode) {
        const message = errorCode ? `Error Code : ${errorCode}\nMessage : ${errorMessage}` : errorMessage;
        Alert.alert(this.I18n.t("syncError"), message, [{
                text: this.I18n.t('tryAgain'),
                onPress: () => this.sync()
            },
                {text: this.I18n.t('cancel'), onPress: _.noop, style: 'cancel'},
            ]
        );
    }

    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
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
        this.unsubscribe = NetInfo.addEventListener(this._handleConnectivityChange);
        NetInfo.fetch().then((isConnected) => {
            this.onConnectionChange(isConnected)
        });
    }

    _handleConnectivityChange = (state) => {
        this.onConnectionChange(state.isConnected);
    };

    componentWillUnmount() {
        this.unsubscribe && this.unsubscribe();
        super.componentWillUnmount();
    }

    sync() {
        this.setState(({syncStarted}) => {
            if (!syncStarted) {
                this.startSync();
                return {syncStarted: true}
            }
        });
    }

    /**
     * As part of manual sync,
     * we'll first replace the "background-sync" job with a "dummy sync" job,
     * perform manual-sync and then,
     * replace the "dummy sync" job again with "background-sync" job.
     *
     * In react-native-background-worker, when we schedule a job with same jobKey(Name) as an existing job,
     * it replaces the old one with new one. Therefore, above specified steps are supposed to fulfill our need to NOT run
     * background-sync in parallel with manual-sync.
     *
     * This is done, as we do not have a way to cancel jobs by name directly in react-native-background-worker.
     * We could only cancel by id, but we do not want to store job id in db.
     * @returns {Promise<void>}
     */
    async startSync() {
        if (this.state.isConnected) {
            const syncService = this.context.getService(SyncService);
            const onError = this._onError.bind(this);
            this._preSync();
            //sending connection info like this because this returns promise and not possible in the action
            let connectionInfo;
            await NetInfo.fetch().then((x) => connectionInfo = x);
            await ScheduleDummySyncJob(); //Replace background-sync Job with a Dummy No-op job
            syncService.sync(
                EntityMetaData.model(),
                (progress) => this.progressBarUpdate(progress),
                (message) => this.messageCallBack(message),
                connectionInfo,
                this.state.startTime,
                SyncService.syncSources.SYNC_BUTTON,
                () => AsyncAlert('resetSyncTitle', 'resetSyncDetails', this.I18n)
            ).catch(onError)
              .finally(ScheduleSyncJob);//Replace Dummy No-op job with valid background-sync job
        } else {
            const ignoreBugsnag = true;
            this._onError(new Error('internetConnectionError'), ignoreBugsnag);
        }
    }

    renderSyncModal() {
        return <ProgressBarView
            progress={this.state.progress}
            message={this.state.message}
            syncing={this.state.syncing}
            onPress={this._postSync.bind(this)}
            notifyUserOnCompletion={true}
        />;
    }

    get syncIcon() {
        const icon = this.props.icon("sync", {
            color: Colors.headerIconColor,
            alignSelf: 'center',
            fontSize: 30
        });
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const totalPending = entitySyncStatusService.getTotalEntitiesPending();
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
