import {Alert, Dimensions, Modal, NetInfo, Text, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import Path from "../framework/routing/Path";
import {Icon as NBIcon} from "native-base";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import {EntityMetaData, SubjectType, WorkLists, WorkList} from "openchs-models";
import EntityService from "../service/EntityService";
import EntitySyncStatusService from "../service/EntitySyncStatusService";
import DynamicGlobalStyles from "../views/primitives/DynamicGlobalStyles";
import MyDashboardView from "./mydashbaord/MyDashboardView";
import FamilyFolderView from "./familyfolder/FamilyFolderView";
import VideoListView from "./videos/VideoListView";
import CHSNavigator from "../utility/CHSNavigator";
import RuleEvaluationService from "../service/RuleEvaluationService";
import General from "../utility/General";
import ProgramConfigService from "../service/ProgramConfigService";
import CHSContent from "./common/CHSContent";
import Styles from "./primitives/Styles";
import Colors from "./primitives/Colors";
import MessageService from "../service/MessageService";
import AuthenticationError from "../service/AuthenticationError";
import AuthService from "../service/AuthService";
import RuleService from "../service/RuleService";
import bugsnag from "../utility/bugsnag";
import {IndividualSearchActionNames as IndividualSearchActions} from "../action/individual/IndividualSearchActions";
import {LandingViewActionsNames as LandingViewActions} from "../action/LandingViewActions";
import {SyncTelemetryActionNames as SyncTelemetryActions} from "../action/SyncTelemetryActions";
import UserInfoService from "../service/UserInfoService";
import ProgressBarView from "./ProgressBarView";
import ServerError from "../service/ServerError";
import MenuListView from "./MenuListView";
import RegisterView from "./RegisterView";
import {MyDashboardActionNames} from "../action/mydashboard/MyDashboardActions";
import Reducers from "../reducer";
import {MenuActions} from "../action/MenuViewActions";

const {width, height} = Dimensions.get('window');

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        startSync: PropTypes.bool
    };

    static defaultProps = {
        startSync: false
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.menuAction);
        this.state = {
            syncing: false,
            error: false,
            isConnected: true,
            displayActionSelector: false,
            hideRegister: context.getService(UserInfoService).getUserSettings().hideRegister,
        };
        this.createStyles();
        this.renderSyncModal = this.renderSyncModal.bind(this);
    }

    viewName() {
        return "MenuView";
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 48, padding: 8};
    static barIconStyle = {color: 'white', opacity: 0.8, alignSelf: 'center', fontSize: 40};

    createStyles() {
        this.columnStyle = {
            marginHorizontal: DynamicGlobalStyles.resizeWidth(29),
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: DynamicGlobalStyles.resizeWidth(71),
            flexDirection: 'column'
        };
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

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    changePasswordView() {
        CHSNavigator.navigateToChangePasswordView(this);
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
        this.dispatchAction(MyDashboardActionNames.ON_LOAD);

        //To load subjectType after sync
        this.dispatchAction(IndividualSearchActions.ON_LOAD);

        //To re-render LandingView after sync
        this.dispatchAction(LandingViewActions.ON_LOAD);
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
        if (this.props.startSync) {
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

    progressBarUpdate(progress) {
        this.dispatchAction(MenuActions.ON_UPDATE, {progress})
    }

    messageCallBack(message) {
        this.dispatchAction(MenuActions.ON_MESSAGE_CALLBACK, {message})
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

    _logout = () => {
        const authService = this.context.getService(AuthService);
        authService.logout().then(() => {
            CHSNavigator.navigateToLoginView(this, false);
        });
    };

    logout() {
        Alert.alert(
            this.I18n.t("logoutConfirmationTitle"),
            this.I18n.t("logoutConfirmationMessage"),
            [{
                text: this.I18n.t('logoutConfirmed'),
                onPress: this._logout,
            }, {text: this.I18n.t('logoutCancelled'), onPress: _.noop, style: 'cancel'},
            ]
        );
    }

    myDashboard() {
        TypedTransition.from(this).to(MyDashboardView);
    }

    home() {
        CHSNavigator.navigateToLandingView(this, true);
    }

    familyFolder() {
        TypedTransition.from(this).to(FamilyFolderView);
    }

    videoListView() {
        TypedTransition.from(this).to(VideoListView);
    }

    deleteData() {
        this.getService(AuthService).clearData().then(() => this.reset());
    }

    more() {
        TypedTransition.from(this).with({
            icon: (iconName) => Icon(iconName),
            syncIcon: () => this.syncIcon(),
            hideRegister: this.state.hideRegister,
            register: this.register.bind(this),
            myDashboard: this.myDashboard.bind(this),
            familyFolder: this.familyFolder.bind(this),
            videoListView: this.videoListView.bind(this),
            sync: this.sync.bind(this),
            logout: this.logout.bind(this),
            changePasswordView: this.changePasswordView.bind(this),
            settingsView: this.settingsView.bind(this),
            onDelete: this.onDelete.bind(this),
        }).to(MenuListView);
    }

    register() {
        TypedTransition.from(this).to(RegisterView);
    }

    onDelete() {
        Alert.alert(
            this.I18n.t('deleteSchemaNoticeTitle'),
            this.I18n.t('deleteSchemaConfirmationMessage'),
            [
                {text: this.I18n.t('yes'), onPress: () => this.deleteData()},
                {
                    text: this.I18n.t('no'), onPress: () => {
                    }, style: 'cancel'
                }
            ]
        )
    };

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

    syncIcon(style, isSelected) {
        const icon = Icon("sync", style, isSelected);
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const totalPending = _.sum(entitySyncStatusService.geAllSyncStatus().map(s => s.queuedCount));
        return totalPending > 0 ? Badge(totalPending, style)(icon) : icon;
    }

    renderBottomBarIcons(icon, menuMessageKey, pressHandler, isSelected, idx) {
        return (<View key={idx} style={{
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <TouchableOpacity style={{height: 40, width: 40}} onPress={pressHandler}>
                {icon}
            </TouchableOpacity>
            <Text style={{
                fontSize: Styles.smallerTextSize,
                fontStyle: 'normal',
                color: isSelected ? Colors.ActionButtonColor : 'white',
                lineHeight: 10,
                alignSelf: 'center', paddingTop: 4
            }}>{menuMessageKey}</Text>
        </View>);
    }

    render() {
        General.logDebug("MenuView", "render");
        const subjectTypes = this.context.getService(EntityService).getAll(SubjectType.schema.name);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : subjectTypes[0].registerIcon();
        const registerMenuItem = !this.state.hideRegister ? [Icon(registerIcon, MenuView.barIconStyle, this.props.registerSelected), this.I18n.t("register"), subjectTypes[0] && this.register.bind(this), this.props.registerSelected] : [];
        const bottomBarIcons = [
            [Icon("home", MenuView.barIconStyle, this.props.homeSelected), this.I18n.t("home"), this.home.bind(this), this.props.homeSelected],
            registerMenuItem,
            [Icon("view-list", MenuView.barIconStyle, this.props.dashboardSelected), this.I18n.t("Dashboard"), this.myDashboard.bind(this), this.props.dashboardSelected],
            [this.syncIcon(MenuView.barIconStyle, this.state.syncing), this.I18n.t("Sync"), this.sync.bind(this), this.state.syncing],
            [Icon("menu", MenuView.barIconStyle, this.props.moreSelected), this.I18n.t("More"), this.more.bind(this), this.props.moreSelected],
        ];
        return (
            <View style={{
                height: 70,
                position: 'absolute',
                bottom: 0,
                width: '100%',
                backgroundColor: Styles.blackColor,
                flexDirection: 'row',
                justifyContent: 'space-around'
            }}>
                {this.renderSyncModal()}
                {bottomBarIcons.map(([icon, display, cb, isSelected], idx) => this.renderBottomBarIcons(icon, display, cb, isSelected, idx))}</View>
        );
    }
}

function Icon(iconName, iconStyle, isSelected) {
    //Arjun: i hate to do this. but MCI does not provide a good video icon and can't provide on decent UI
    //Arjun: TODO someday we need to have one single icon library.
    const style = iconStyle ? (isSelected ? {
        ...iconStyle,
        color: Colors.ActionButtonColor
    } : iconStyle) : MenuView.iconStyle;
    if (_.startsWith(iconName, 'video')) {
        return <NBIcon name={iconName} style={style}/>
    }
    return <MCIIcon name={iconName} style={style}/>
}

const Badge = (number, style) => (icon) => {
    const [height, width, fontSize, paddingLeft] = number > 99 ? [24, 24, 12, 0] : [24, 24, 14, 6];
    return (
        <View style={{backgroundColor: _.isNil(style) ? Styles.defaultBackground : Styles.blackColor}}>
            <View style={{
                height: _.isNil(style) ? height : height / 2,
                width: _.isNil(style) ? width : width / 2,
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: 'mediumvioletred',
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Text style={{
                    fontSize: _.isNil(style) ? fontSize : fontSize / 2,
                    color: 'white',
                    flex: 1,
                    textAlignVertical: 'center',
                    textAlign: 'center'
                }}>{number}</Text>
            </View>
            {icon}
        </View>
    );
};

export default MenuView;
