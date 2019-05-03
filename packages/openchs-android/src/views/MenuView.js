import {Alert, Dimensions, Modal, NetInfo, Text, TouchableOpacity, TouchableWithoutFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import Path from "../framework/routing/Path";
import {Button, Icon as NBIcon} from "native-base";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import {EntityMetaData, SubjectType} from 'openchs-models';
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
import ProgramService from "../service/program/ProgramService";
import ActionSelector from "./common/ActionSelector";

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
        super(props, context);
        this.state = {syncing: false, error: false, isConnected: true, displayActionSelector: false, hideRegister:context.getService(UserInfoService).getUserSettings().hideRegister};
        this.createStyles();
        this.renderSyncModal = this.renderSyncModal.bind(this);
    }

    viewName() {
        return "MenuView";
    }

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 48, padding: 8};

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

        this.regModalBackground = {
            width: width * .7,
            backgroundColor: 'white',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            padding: 20,
            alignSelf: 'center',
            borderRadius: 8
        };

        this.syncBackground = {
            width: width * .7,
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: 20,
            alignSelf: 'center',
            backgroundColor: Colors.getCode("paperGrey900").color,
        };
        this.syncTextContent = {
            color: Colors.TextOnPrimaryColor
        };

    }

    settingsView() {
        TypedTransition.from(this).to(SettingsView);
    }

    registrationView() {
        this.setState({regModalVisible: true});
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

    sync() {
        if (this.state.isConnected) {
            const syncService = this.context.getService(SyncService);
            const onError = this._onError.bind(this);
            this._preSync();
            syncService.sync(
                EntityMetaData.model(),
                (progress) => this.progressBar.update(progress),
                (message) => this.progressMessage.messageCallBack(message)).catch(onError)
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

    familyFolder() {
        TypedTransition.from(this).to(FamilyFolderView);
    }

    videoListView() {
        TypedTransition.from(this).to(VideoListView);
    }


    onDelete() {
        const service = this.context.getService(EntityService);
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const authService = this.context.getService(AuthService);
        Alert.alert(
            this.I18n.t('deleteSchemaNoticeTitle'),
            this.I18n.t('deleteSchemaConfirmationMessage'),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                        authService.logout().then(() => {
                            service.clearDataIn(EntityMetaData.entitiesLoadedFromServer());
                            entitySyncStatusService.setup(EntityMetaData.model());
                            this.reset();
                        });
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

    renderMenuItem = (maxLength) => (icon, menuMessageKey, pressHandler, idx) => {
        let pad = _.pad(menuMessageKey, 2 * Math.round(maxLength / 2), ' ');
        return (<View key={idx} style={this.columnStyle}>
            <TouchableOpacity style={{height: 84, width: 84, justifyContent: 'flex-end'}} onPress={pressHandler}>
                {icon}
            </TouchableOpacity>
            <Text style={Styles.menuTitle}>{pad}</Text>
        </View>);
    };

    registrationModalItem(key, label, bgColor, onPress) {
        return (<View key={key} style={{paddingTop: 24,}}>
            <Button style={{
                width: '100%',
                backgroundColor: bgColor,
                height: 50,
                elevation: 2
            }}
                    textStyle={{fontSize: 18, lineHeight: 28}}
                    onPress={() => this.setState({regModalVisible: false}, onPress)}>
                <Text>{label}</Text>
            </Button>
        </View>)
    }

    renderRegistrationModal() {
        if (!this.state.displayActionSelector) {
            return null;
        }
        const subjectType = this.context.getService(EntityService).getAll(SubjectType.schema.name)[0];
        const registrationAction = {
            fn: () => CHSNavigator.navigateToRegistration(this, subjectType),
            label: subjectType.name,
            backgroundColor: Colors.AccentColor,
        };
        const programActions = this.context.getService(ProgramService).findAll().map(program => ({
            fn: () => CHSNavigator.navigateToRegistrationThenProgramEnrolmentView(this, program, this, subjectType),
            label: program.beneficiaryName,
            backgroundColor: program.colour,
        }));

        return (
          <ActionSelector
              visible={this.state.displayActionSelector}
              hide={() => this.setState({displayActionSelector: false})}
              actions={[registrationAction].concat(programActions)}
              title={"Register"}
          />
        );
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
                        <View style={{flex: .7}}>
                            <ProgressBarView
                                progressBar={(pb) => this.progressBar = pb}
                                progressMessage={(pm) => this.progressMessage = pm}
                                onPress={this._postSync.bind(this)}/>
                        </View>
                    </View>
                    <View style={{flex: 1}}/>
                </View>
            </Modal>);
    }

    get syncIcon() {
        const icon = Icon("sync");
        const entitySyncStatusService = this.context.getService(EntitySyncStatusService);
        const totalPending = _.sum(entitySyncStatusService.geAllSyncStatus().map(s => s.queuedCount));
        return totalPending > 0 ? Badge(totalPending)(icon) : icon;
    }

    render() {
        General.logDebug("MenuView", "render");
        const subjectTypes = this.context.getService(EntityService).getAll(SubjectType.schema.name);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : subjectTypes[0].registerIcon();
        const registerMenuItem = !this.state.hideRegister ? [[Icon(registerIcon), this.I18n.t("register"), () => subjectTypes[0] && this.setState({displayActionSelector: true})]] : [];
        let otherMenuItems = [
            [Icon("view-list"), this.I18n.t("myDashboard"), this.myDashboard.bind(this)],
            [Icon("account-multiple"), "Family Folder", this.familyFolder.bind(this), () => __DEV__],
            [Icon("video-library"), this.I18n.t("VideoList"), this.videoListView.bind(this)],

            [this.syncIcon, this.I18n.t("syncData"), this.sync.bind(this)],
            [Icon("logout"), this.I18n.t("logout"), this.logout.bind(this)],
            [Icon("account-key"), this.I18n.t("changePassword"), this.changePasswordView.bind(this)],

            [Icon("settings"), this.I18n.t("settings"), this.settingsView.bind(this)],
            [Icon("delete"), "Delete Data", this.onDelete.bind(this), () => __DEV__]
        ];
        const menuItemsData = _.concat(registerMenuItem, otherMenuItems);
        const maxMenuItemDisplay = _.maxBy(menuItemsData, ([i, d, j]) => d.length)[1].length;
        const MenuItems = menuItemsData
            .filter(([icon, display, cb, shouldRender]) => shouldRender === undefined || shouldRender())
            .map(([icon, display, cb], idx) => this.renderMenuItem(maxMenuItemDisplay)(icon, display, cb, idx));
        return (
            <CHSContent>
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                    height: Dimensions.get('window').height, backgroundColor: Styles.defaultBackground,
                    // paddingBottom: 120
                }}>
                    {subjectTypes[0] && this.renderRegistrationModal()}
                    {this.renderSyncModal()}
                    {MenuItems}
                </View>
            </CHSContent>
        );
    }
}

function Icon(iconName) {
    //Arjun: i hate to do this. but MCI does not provide a good video icon and can't provide on decent UI
    //Arjun: TODO someday we need to have one single icon library.
    if (_.startsWith(iconName, 'video')) {
        return <NBIcon name={iconName} style={MenuView.iconStyle}/>
    }
    return <MCIIcon name={iconName} style={MenuView.iconStyle}/>
}

const Badge = (number) => (icon) => {
    const [height, width, fontSize, paddingLeft] = number > 99 ? [24, 24, 12, 0] : [24, 24, 14, 6];
    return (
        <View style={{backgroundColor: Styles.defaultBackground}}>
            <View style={{
                height,
                width,
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: 'mediumvioletred',
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Text style={{
                    fontSize,
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
