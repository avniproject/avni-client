import AbstractComponent from "../framework/view/AbstractComponent";
import UserInfoService from "../service/UserInfoService";
import Colors from "./primitives/Colors";
import RuleEvaluationService from "../service/RuleEvaluationService";
import ProgramConfigService from "../service/ProgramConfigService";
import MessageService from "../service/MessageService";
import RuleService from "../service/RuleService";
import {IndividualSearchActionNames as IndividualSearchActions} from "../action/individual/IndividualSearchActions";
import {LandingViewActionsNames as LandingViewActions} from "../action/LandingViewActions";
import General from "../utility/General";
import {SyncTelemetryActionNames as SyncTelemetryActions} from "../action/SyncTelemetryActions";
import bugsnag from "../utility/bugsnag";
import AuthenticationError from "../service/AuthenticationError";
import CHSNavigator from "../utility/CHSNavigator";
import ServerError from "../service/ServerError";
import {Alert, Dimensions, Modal, NetInfo, Text, View} from "react-native";
import _ from "lodash";
import SyncService from "../service/SyncService";
import {EntityMetaData} from "openchs-models";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import Styles from "./primitives/Styles";
import {Icon as NBIcon} from "native-base";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import React from "react";
import ProgressBarView from "./ProgressBarView";
import Reducers from "../reducer";
import MenuView from "./MenuView";
import {MyDashboardActionNames} from "../action/mydashboard/MyDashboardActions";

const {width, height} = Dimensions.get('window');

class SyncComponent extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.landingView);
        this.state = {
            syncing: false,
            error: false,
            isConnected: true
        };
        this.createStyles();
        this.renderSyncModal = this.renderSyncModal.bind(this);
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
        this.setState({syncing: true, error: false, syncMessage: "syncingData"});
    }

    reset() {
        this.context.getService(RuleEvaluationService).init();
        this.context.getService(ProgramConfigService).init();
        this.context.getService(MessageService).init();
        this.context.getService(RuleService).init();
        this.dispatchAction('RESET');

        //To load subjectType after sync
        this.dispatchAction(IndividualSearchActions.ON_LOAD);
        this.dispatchAction(MyDashboardActionNames.ON_LOAD);

        //To re-render LandingView after sync
        this.dispatchAction(LandingViewActions.ON_LOAD);
    }

    progressBarUpdate(progress) {
        this.dispatchAction(LandingViewActions.ON_UPDATE, {progress})
    }

    messageCallBack(message) {
        this.dispatchAction(LandingViewActions.ON_MESSAGE_CALLBACK, {message})
    }

    _postSync() {
        this.reset();

        const userInfoService = this.context.getService(UserInfoService);
        const userSettings = userInfoService.getUserSettings();

        this.setState({syncing: false, error: false, hideRegister: userSettings.hideRegister});
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error) {
        General.logError(`${this.viewName()}-Sync`, error);
        this.dispatchAction(SyncTelemetryActions.SYNC_FAILED);
        bugsnag.notify(error);
        this.setState({syncing: false});
        if (error instanceof AuthenticationError && error.authErrCode !== 'NetworkingError') {
            General.logError(this.viewName(), "Could not authenticate");
            General.logError(this.viewName(), error);
            General.logError(this.viewName(), "Redirecting to login view");
            CHSNavigator.navigateToLoginView(this, true, (source) => CHSNavigator.navigateToLandingView(source, true, {
                tabIndex: 1,
                menuProps: {startSync: true}
            }));
        } else {
            const errorMessage = error instanceof ServerError ? this.I18n.t('syncServerError') : this.I18n.t(error.message);
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
        if (this.state.startSync) {
            this.sync();
        }
    }

    onConnectionChange(isConnected) {
        if (!this.state.syncing) {
            isConnected ? this.setState({isConnected: true}) : this.setState({isConnected: false});
        }
    }

    componentDidMount() {
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
            this._onError(new Error('internetConnectionError'))
        }
    }

    renderSyncModal() {
        return (
            <Modal animationType={'fade'}
                   transparent={true}
                   onRequestClose={() => {
                       alert('Modal has been closed.');
                   }}
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
        const icon = this.Icon("sync", {
            color: Colors.headerIconColor,
            alignSelf: 'center',
            fontSize: 30
        });
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const totalPending = _.sum(entitySyncStatusService.geAllSyncStatus().map(s => s.queuedCount));
        return !this.state.syncing && totalPending > 0 ? Badge(totalPending)(icon) : icon;
    }

    Icon(iconName, iconStyle, isSelected) {
        //Arjun: i hate to do this. but MCI does not provide a good video icon and can't provide on decent UI
        //Arjun: TODO someday we need to have one single icon library.
        const style = iconStyle ? (isSelected ? {
            ...iconStyle,
            color: Colors.iconSelectedColor
        } : iconStyle) : MenuView.iconStyle;
        if (_.startsWith(iconName, 'video')) {
            return <NBIcon name={iconName} style={style}/>
        }
        return <MCIIcon name={iconName} style={style}/>
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
