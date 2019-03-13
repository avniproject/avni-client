import {ActivityIndicator, Alert, Dimensions, Modal, Text, TouchableOpacity, View} from "react-native";
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from 'lodash';
import Path from "../framework/routing/Path";
import {Icon as NBIcon} from "native-base";
import MCIIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";
import SyncService from "../service/SyncService";
import {EntityMetaData, SubjectType} from "openchs-models";
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
import Fonts from "./primitives/Fonts";
import Colors from "./primitives/Colors";
import MessageService from "../service/MessageService";
import AuthenticationError from "../service/AuthenticationError";
import AuthService from "../service/AuthService";
import RuleService from "../service/RuleService";
import bugsnag from "../utility/bugsnag";
import {IndividualSearchActionNames as IndividualSearchActions} from "../action/individual/IndividualSearchActions";
import {LandingViewActionsNames as LandingViewActions} from "../action/LandingViewActions";
import UserInfoService from "../service/UserInfoService";

const {width, height} = Dimensions.get('window');

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        startSync: React.PropTypes.bool
    };

    static defaultProps = {
        startSync: false
    };

    constructor(props, context) {
        super(props, context);
        this.state = {syncing: false, error: false};
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
        const isIndividual = this.context.getService(EntityService).getAll(SubjectType.schema.name)[0].isIndividual();
        return isIndividual ? CHSNavigator.navigateToIndividualRegisterView(this): CHSNavigator.navigateToSubjectRegisterView(this);
    }

    changePasswordView() {
        CHSNavigator.navigateToChangePasswordView(this);
    }

    _preSync() {
        this.setState({syncing: true, error: false, syncMessage: "syncingData"});
    }

    _postSync() {
        this.context.getService(RuleEvaluationService).init();
        this.context.getService(ProgramConfigService).init();
        this.context.getService(MessageService).init();
        this.context.getService(RuleService).init();
        this.dispatchAction('RESET');

        //To load subjectType after sync
        this.dispatchAction(IndividualSearchActions.ON_LOAD);

        //To re-render LandingView after sync
        this.dispatchAction(LandingViewActions.ON_LOAD);

        const userInfoService = this.context.getService(UserInfoService);
        const userSettings = userInfoService.getUserSettings();

        this.setState({syncing: false, error: false});
        General.logInfo(this.viewName(), 'Sync completed dispatching reset');
    }

    _onError(error) {
        General.logError(`${this.viewName()}-Sync`, error);
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
            Alert.alert(this.I18n.t("syncError"), error.message, [{
                    text: this.I18n.t('tryAgain'),
                    onPress: () => this.sync()
                },
                    {text: this.I18n.t('cancel'), onPress: _.noop, style: 'cancel'},
                ]
            );
        }
    }

    componentWillMount() {
        if (this.props.startSync) {
            this.sync();
        }
    }

    messageCallBack(syncMessage) {
        this.setState({syncMessage});
    }

    sync() {
        try {
            const syncService = this.context.getService(SyncService);
            const onError = this._onError.bind(this);
            const postSync = this._postSync.bind(this);
            this._preSync();
            syncService.sync(EntityMetaData.model(), (message) => this.messageCallBack(message)).then(postSync, onError);
        } catch (e) {
            this._onError(e);
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
                        <ActivityIndicator
                            color={Colors.DarkPrimaryColor}
                            size={'large'}
                            style={{flex: .3}}
                        />
                        <View style={{flex: .7}}>
                            <Text style={[this.syncTextContent, Fonts.typography("paperFontSubhead")]}>
                                {this.I18n.t(_.isNil(this.state.syncMessage)? "doingNothing" : this.state.syncMessage)}
                            </Text>
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
        let menuItemsData = [
            [Icon(registerIcon), this.I18n.t("register"), this.registrationView.bind(this)],
            [Icon("view-list"), this.I18n.t("myDashboard"), this.myDashboard.bind(this)],
            [Icon("account-multiple"), "Family Folder", this.familyFolder.bind(this), () => __DEV__],
            [Icon("video-library"), this.I18n.t("VideoList"), this.videoListView.bind(this)],

            [this.syncIcon, this.I18n.t("syncData"), this.sync.bind(this)],
            [Icon("logout"), this.I18n.t("logout"), this.logout.bind(this)],
            [Icon("account-key"), this.I18n.t("changePassword"), this.changePasswordView.bind(this)],

            [Icon("settings"), this.I18n.t("settings"), this.settingsView.bind(this)],
            [Icon("delete"), "Delete Data", this.onDelete.bind(this), () => __DEV__]
        ];
        const maxMenuItemDisplay = _.maxBy(menuItemsData, ([i, d, j]) => d.length)[1].length;
        const MenuItems = menuItemsData
            .filter(([icon, display, cb, shouldRender]) => shouldRender === undefined || shouldRender())
            .map(([icon, display, cb], idx) => this.renderMenuItem(maxMenuItemDisplay)(icon, display, cb, idx));
        return (
            <CHSContent>
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                    height: Dimensions.get('window').height, backgroundColor: Styles.defaultBackground
                }}>
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
            <View style={{height, width, position: 'absolute', top: 0, right: 0, backgroundColor: 'purple', borderRadius: 14, justifyContent:'center', alignItems:'center'}}>
                <Text style={{fontSize, color: 'white', flex: 1, textAlignVertical: 'center', textAlign: 'center'}}>{number}</Text>
            </View>
            {icon}
        </View>
    );
};

export default MenuView;
