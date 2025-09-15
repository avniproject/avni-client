import AbstractComponent from "../framework/view/AbstractComponent";
import Colors from "./primitives/Colors";
import {SyncActionNames as SyncActions} from "../action/SyncActions";
import General from "../utility/General";
import {SyncTelemetryActionNames as SyncTelemetryActions} from "../action/SyncTelemetryActions";
import AuthenticationError from "../service/AuthenticationError";
import CHSNavigator from "../utility/CHSNavigator";
import ServerError, {getAvniError} from "../service/ServerError";
import {Alert, Text, ToastAndroid, TouchableNativeFeedback, View} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import NetInfo from "@react-native-community/netinfo";
import _ from "lodash";
import SyncService from "../service/SyncService";
import {EntityMetaData, SyncError} from "avni-models";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import React from "react";
import ProgressBarView from "./ProgressBarView";
import Reducers from "../reducer";
import AsyncAlert from "./common/AsyncAlert";
import AvniError from "../framework/errorHandling/AvniError";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";
import {IgnorableSyncError} from "openchs-models";

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

    progressBarUpdate(progress, totalNumberOfPagesForCurrentEntity, numberOfPagesProcessedForCurrentEntity) {
        this.dispatchAction(SyncActions.ON_UPDATE, {progress, numberOfPagesProcessedForCurrentEntity, totalNumberOfPagesForCurrentEntity})
    }

    messageCallBack(message) {
        this.dispatchAction(SyncActions.ON_MESSAGE_CALLBACK, {message})
    }

    _postSync() {
        this.context.getService(SyncService).resetServicesAfterFullSyncCompletion(SyncService.syncSources.SYNC_BUTTON);
        this.dispatchAction(SyncActions.POST_SYNC);
        this.setState({syncStarted: false});
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error, ignoreBugsnag) {
        General.logError(`${this.viewName()}-Sync`, error);
        const isIgnorableSyncError = error instanceof IgnorableSyncError;
        this.setState({syncStarted: false});
        !isIgnorableSyncError && this.dispatchAction(SyncTelemetryActions.SYNC_FAILED);
        const isServerError = error instanceof ServerError;
        const isAvniError = error instanceof AvniError;
        
        //Do not notify bugsnag if it's a server error since it would have been notified on server bugsnag already.
        if (!ignoreBugsnag && !isServerError && !isIgnorableSyncError && !isAvniError) {
            ErrorUtil.notifyBugsnag(error, "SyncComponent");
        }
        
        this.dispatchAction(SyncActions.ON_ERROR);
        if (isIgnorableSyncError) return;
        
        // First check if it's an AvniError - this should be handled first to ensure user-friendly messages
        if (isAvniError) {
            General.logDebug(this.viewName(), "Handling AvniError with user message: " + error.userMessage);
            this.ErrorAlert(error);
        } else if (error instanceof AuthenticationError && error.authErrCode !== 'NetworkingError') {
            General.logError(this.viewName(), "Could not authenticate");
            General.logError(this.viewName(), error);
            General.logError(this.viewName(), "Redirecting to login view");
            CHSNavigator.navigateToLoginView(this, true, (source) => CHSNavigator.navigateToLandingView(source, true, {
                tabIndex: 1,
                menuProps: {startSync: true}
            }));
        } else if (!this.state.isConnected) {
            this.ErrorAlert(AvniError.create(this.I18n.t('internetConnectionError')));
        } else if (isServerError) {
            getAvniError(error, this.I18n).then((avniError) => this.ErrorAlert(avniError));
        } else if (error instanceof SyncError) {
            const userMessage = `Error Code : ${error.errorCode}\nMessage : ${error.errorText}`;
            this.ErrorAlert(AvniError.createFromUserMessageAndStackTrace(userMessage, ErrorUtil.getNavigableStackTraceSync(error)));
        } else if (!_.isNil(error)) {
            this.ErrorAlert(ErrorUtil.getAvniErrorSync(error));
        } else {
            const errorMessage = error.message || this.I18n.t("unknownError");
            this.ErrorAlert(AvniError.create(errorMessage));
        }
    }

    ErrorAlert(avniError) {
        const userMessage = avniError.userMessage || this.I18n.t("unknownError");
        Alert.alert(this.I18n.t("syncError"), userMessage, [
                {
                    text: this.I18n.t('tryAgain'),
                    onPress: () => this.sync()
                },
                {
                    text: this.I18n.t('cancel'),
                    onPress: _.noop,
                    style: 'cancel'
                },
                {
                    text: this.I18n.t('copyErrorAndCancel'),
                    onPress: () => {
                        General.logDebug("SyncComponent", avniError.reportingText);
                        Clipboard.setString(avniError.reportingText);
                        ToastAndroid.show("reportCopiedReportByPasting", ToastAndroid.SHORT)
                    }
                }
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
        NetInfo.fetch().then((connection) => {
            this.onConnectionChange(connection.isConnected)
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
        if (this.state.backgroundSyncInProgress) {
            ToastAndroid.show(this.I18n.t('backgroundSyncInProgress'), ToastAndroid.SHORT);
            return;
        }
        this.setState(({syncStarted}) => {
            if (!syncStarted) {
                // Use setTimeout to avoid setState during render cycle
                setTimeout(() => this.startSync(), 0);
                return {syncStarted: true}
            }
        });
    }

    /**
     * Initiates manual sync triggered by user action.
     * 
     * Sync coordination is handled by SyncService's queue-based approach:
     * - If background sync is running, manual sync is queued and waits for completion
     * - If another manual sync is running, appropriate UI feedback is shown
     * - Background sync jobs continue on their scheduled intervals independently,
     *   it skips actual processing if another sync is running
     * 
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
            // No longer need to schedule dummy job - queue-based sync handles coordination
            const syncResult = await syncService.sync(
                EntityMetaData.model(),
                (progress, numberOfPagesProcessedForCurrentEntity, totalNumberOfPagesForCurrentEntity) => this.progressBarUpdate(progress, numberOfPagesProcessedForCurrentEntity, totalNumberOfPagesForCurrentEntity),
                (message) => this.messageCallBack(message),
                connectionInfo,
                this.state.startTime,
                SyncService.syncSources.SYNC_BUTTON,
                () => AsyncAlert('resetSyncTitle', 'resetSyncDetails', this.I18n)
            ).catch(onError);
            
            // If sync was debounced (no actual sync happened), reset UI state only
            // Check if sync returned immediately without progress updates (debounced case)
            if (syncResult === SyncService.syncSources.SYNC_BUTTON && this.state.syncing && this.state.progress === 0) {
                this.dispatchAction(SyncActions.POST_SYNC);
                this.setState({syncStarted: false});
            }
        } else {
            const ignoreBugsnag = true;
            this._onError(new Error('internetConnectionError'), ignoreBugsnag);
        }
    }

    renderSyncModal() {
        return <ProgressBarView
            progress={this.state.progress}
            currentPageNumber={this.state.numberOfPagesProcessedForCurrentEntity}
            totalNumberOfPages={this.state.totalNumberOfPagesForCurrentEntity}
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
        const syncDisabledIcon = this.props.icon("sync-off", {
            color: Colors.DisabledButtonColor,
            alignSelf: 'center',
            fontSize: 30
        });
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const totalPending = entitySyncStatusService.getTotalEntitiesPending();
        if (this.state.backgroundSyncInProgress) {
            return syncDisabledIcon;
        } else {
            return !this.state.syncing && totalPending > 0 ? <Badge icon={icon} number={totalPending}/> : icon;
        }
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

const Badge = ({number, icon}) => {
    const [height, width, fontSize] = number > 99 ? [17, 17, 9, 0] : [17, 17, 11, 6];
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
