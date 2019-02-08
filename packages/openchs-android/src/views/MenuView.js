import {Alert, ToastAndroid, Text, View, Dimensions, Modal, ActivityIndicator} from "react-native";
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from 'lodash';
import Path from "../framework/routing/Path";
import {Button} from "native-base";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Icon as Icon2} from "native-base";
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

    static iconStyle = {color: Colors.ActionButtonColor, opacity: 0.8, alignSelf: 'center', fontSize: 48};

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

    renderIcon(iconName) {
        //i hate to do this. but MCI does not provide a good video icon and can't provide on decent UI
        // TODO someday we need to have one single icon library.
        if (_.startsWith(iconName, 'video')) {
            return <Icon2 name={iconName} style={MenuView.iconStyle}/>
        }
        return <Icon name={iconName} style={MenuView.iconStyle}/>
    }

    renderMenuItem = (maxLength) => (iconName, menuMessageKey, pressHandler, idx) => {
        let pad = _.pad(menuMessageKey, 2 * Math.round(maxLength / 2), ' ');
        return (<View key={idx} style={this.columnStyle}>
            <Button style={{alignSelf: 'center'}} onPress={pressHandler} transparent large>
                {this.renderIcon(iconName)}
            </Button>
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

    render() {
        let menuItemsData = [
            //TODO Show a subject specific register icon which means subjectTypes will have to be
            // TODO fetched first which won't be available on the first time load of this page OR use generic plus-box
            // TODO ["plus-box", this.I18n.t("register"), this.registrationView.bind(this)],
            ["account-plus", this.I18n.t("register"), this.registrationView.bind(this)],
            ["view-list", this.I18n.t("myDashboard"), this.myDashboard.bind(this)],
            ["account-multiple", "Family Folder", this.familyFolder.bind(this), () => __DEV__],
            ["video-library", this.I18n.t("VideoList"), this.videoListView.bind(this)],

            ["sync", this.I18n.t("syncData"), this.sync.bind(this)],
            ["logout", this.I18n.t("logout"), this.logout.bind(this)],
            ["account-key", this.I18n.t("changePassword"), this.changePasswordView.bind(this)],

            ["settings", this.I18n.t("settings"), this.settingsView.bind(this)],
            ["delete", "Delete Data", this.onDelete.bind(this), () => __DEV__]
        ];
        const maxMenuItemDisplay = _.maxBy(menuItemsData, ([i, d, j]) => d.length)[1].length;
        const MenuItems = menuItemsData
            .filter(([key, display, cb, shouldRender]) => shouldRender === undefined || shouldRender())
            .map(([key, display, cb], idx) => this.renderMenuItem(maxMenuItemDisplay)(key, display, cb, idx));
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

export default MenuView;
