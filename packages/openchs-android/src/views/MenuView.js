import {Alert, Linking, Platform, ScrollView, SectionList, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import Path from "../framework/routing/Path";
import TypedTransition from "../framework/routing/TypedTransition";
import CHSNavigator from "../utility/CHSNavigator";
import General from "../utility/General";
import CHSContent from "./common/CHSContent";
import Colors from "./primitives/Colors";
import AuthService from "../service/AuthService";
import RuleService from "../service/RuleService";
import ProgramConfigService from "../service/ProgramConfigService";
import MessageService from "../service/MessageService";
import {IndividualSearchActionNames as IndividualSearchActions} from "../action/individual/IndividualSearchActions";
import {LandingViewActionsNames as LandingViewActions} from "../action/LandingViewActions";
import {MyDashboardActionNames} from "../action/mydashboard/MyDashboardActions";
import RuleEvaluationService from "../service/RuleEvaluationService";
import Distances from "./primitives/Distances";
import Fonts from "./primitives/Fonts";
import CHSContainer from "./common/CHSContainer";
import {Icon} from 'native-base';
import Separator from "./primitives/Separator";
import SettingsView from "./settings/SettingsView";
import Styles from "./primitives/Styles";
import DeviceInfo from "react-native-device-info";
import {Schema} from 'avni-models';
import MCIIcon from "react-native-vector-icons/FontAwesome";
import Config from "../framework/Config";
import {firebaseEvents, logEvent} from "../utility/Analytics";
import NewsService from "../service/news/NewsService";
import NewsListView from "./news/NewsListView";
import {Badge} from "./common/Badge";
import ProgressBarView from "./ProgressBarView";
import Reducers from "../reducer";
import {MenuActionNames} from "../action/MenuActions";
import MediaQueueService from "../service/MediaQueueService";
import SyncService from "../service/SyncService";
import moment from "moment";
import StaticMenuItemFactory from "./menu/StaticMenuItemFactory";
import {MenuItem} from 'openchs-models';
import StaticMenuItem from "./menu/StaticMenuItem";
import WebView from "react-native-webview";

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        menuIcon: PropTypes.func
    };
    static iconStyle = {color: Colors.DefaultPrimaryColor, opacity: 0.8, alignSelf: 'center', fontSize: 20, padding: 8};

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.menuView);
    }

    static Item({I18n, icon, titleKey, onPress, visible = true}) {
        return visible ?
            (<TouchableNativeFeedback onPress={onPress}
                                      background={TouchableNativeFeedback.SelectableBackground()}>
                <View
                    style={styles.container}>
                    {icon}
                    <View style={styles.textContainer}>
                        <Text
                            style={[Fonts.typography("paperFontSubhead"), styles.optionStyle]}>{I18n.t(titleKey)}</Text>
                    </View>
                    {(['logout', 'Delete Data', 'backup', 'feedback'].includes(titleKey)) ? <View/> :
                        <Icon style={styles.iconStyle} name='chevron-right' type='MaterialIcons'/>}
                </View>
            </TouchableNativeFeedback>)
            : <View/>
    }

    componentWillMount() {
        super.componentWillMount();
        this.bindMenuActions();
    }

    componentDidMount() {
        const authService = this.context.getService(AuthService);
        authService.getAuthToken().then((authToken) => this.dispatchAction(MenuActionNames.ON_LOAD, {authToken}));
}

    icon(name, style = {}) {
        return this.props.menuIcon(name, [MenuView.iconStyle, style]);
    }

    beneficiaryModeStatus() {
        return !!this.state.userInfo.getSettings().showBeneficiaryMode;
    }

    viewName() {
        return "MenuView";
    }

    changePasswordView() {
        CHSNavigator.navigateToChangePasswordView(this);
    }

    _logout = () => {
        const authService = this.context.getService(AuthService);
        authService.logout().then(() => {
            logEvent(firebaseEvents.LOG_OUT);
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

    userSettingsView() {
        TypedTransition.from(this).to(SettingsView);
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

    deleteData() {
        this.getService(AuthService).logout()
            .then(() => this.getService(SyncService).clearData())
            .then(() => this.reset())
            .then(() => CHSNavigator.navigateToLoginView(this, false));
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

    uploadCatchmentDatabase() {
        if (!this.state.oneSyncCompleted || this.state.unsyncedTxData) {
            Alert.alert(this.I18n.t('uploadCatchmentDatabaseErrorTitle'),
                this.getCatchmentUploadErrorMessage(),
                [{
                    text: this.I18n.t('ok'), onPress: () => {
                    }, style: 'cancel'
                }]);
        } else {
            this.startUploadDatabase('uploadCatchmentDatabase', 'uploadCatchmentDatabaseConfirmationMessage', MediaQueueService.DumpType.Catchment);
        }
    };

    uploadDatabase() {
        this.startUploadDatabase('uploadDatabase', 'uploadCatchmentDatabaseConfirmationMessage', MediaQueueService.DumpType.Adhoc);
    }

    startUploadDatabase(titleKey, messageKey, dumpType) {
        Alert.alert(
            this.I18n.t(titleKey),
            this.I18n.t(messageKey),
            [
                {
                    text: this.I18n.t('yes'), onPress: () => {
                        this.dispatchAction(MenuActionNames.ON_BACKUP_DUMP, {
                            dumpType: dumpType,
                            onBackupDumpCb: (percentDone, message) => this.dispatchAction(MenuActionNames.ON_BACKUP_PROGRESS, {
                                percentDone: percentDone,
                                message: message
                            })
                        });
                    }
                },
                {
                    text: this.I18n.t('no'), onPress: () => {
                    }, style: 'cancel'
                }
            ]
        );
    }

    getCatchmentUploadErrorMessage() {
        let unSyncedDataMessage = this.state.unsyncedTxData ? `${this.I18n.t('uploadCatchmentDatabaseLocalUnsavedData')}` : "";
        let noSyncCompletedMessage = this.state.oneSyncCompleted ? "" : `${this.I18n.t('uploadCatchmentDatabaseLocalOneSyncNeeded')}`;
        return `${unSyncedDataMessage} ${noSyncCompletedMessage} ${this.I18n.t('uploadCatchmentDatabaseActionRecommended')}`;
    }

    onNews() {
        TypedTransition.from(this).to(NewsListView);
    }

    background() {
        return Platform['Version'] >= 21 ?
            TouchableNativeFeedback.SelectableBackgroundBorderless() :
            TouchableNativeFeedback.SelectableBackground();
    }

    onFeedback() {
        const url = 'https://docs.google.com/forms/d/e/1FAIpQLSdevhSf89u0rW_xJUazsT-ImyWIiNz-XNmElR17XCAiUrlRtg/viewform';
        Linking.openURL(url);
    }

    renderNewsBadge(unreadCount) {
        const newsText = <Text
            style={[Fonts.typography("paperFontSubhead"), styles.optionStyle]}>{this.I18n.t('news')}</Text>;
        return <TouchableNativeFeedback onPress={this.onNews.bind(this)}
                                        background={TouchableNativeFeedback.SelectableBackground()}>
            <View style={styles.container}>
                {this.icon("newspaper-variant-outline")}
                <View style={[styles.textContainer, {paddingBottom: 10}]}>
                    <Badge
                        hideWhenZero
                        number={unreadCount || 0}
                        component={newsText}/>
                </View>
                <Icon style={styles.iconStyle} name='chevron-right' type='MaterialIcons'/>
            </View>
        </TouchableNativeFeedback>
    }

    renderTitle() {
        return (
            <TouchableNativeFeedback onPress={() => this.userSettingsView()}
                                     background={this.background()}>
                <View style={{
                    backgroundColor: Colors.headerBackgroundColor,
                    flexDirection: 'row',
                    height: 70,
                    elevation: 3,
                    paddingHorizontal: 16
                }}>
                    <MCIIcon style={{fontSize: 35, color: Colors.headerIconColor, alignSelf: 'center'}}
                             name={'user-circle'}/>
                    <View style={{flexDirection: 'column', alignSelf: 'center'}}>
                        <Text style={[{
                            color: Colors.headerTextColor,
                            fontSize: 18,
                            marginLeft: 20
                        }]}>{this.state.userInfo.organisationName ?
                            this.state.userInfo.username ?
                                `${this.state.userInfo.username} (${this.state.userInfo.organisationName})`
                                : this.state.userInfo.organisationName
                            : this.I18n.t('syncRequired')
                        }</Text>
                        <Text style={[{
                            color: Colors.headerTextColor,
                            fontSize: 12,
                            marginLeft: 20
                        }]}>{this.I18n.t('editSettings')}</Text>
                    </View>
                </View>
            </TouchableNativeFeedback>);
    }

    onMetabaseReportClick() {
        const questionURL = "https://reporting.avniproject.org/public/question/11265388-5909-438e-9d9a-6faaa0c5863f";
        const params = `?username=${encodeURIComponent(this.state.userInfo.username)}&name=${encodeURIComponent(this.state.userInfo.name)}&month=${moment().month() + 1}&year=${moment().year()}`;
        Linking.openURL(`${questionURL}${params}`);
    }

    createMenuDataGroup() {
        return [
            StaticMenuItemFactory.getSyncMenus(),
            StaticMenuItemFactory.getUserMenus(),
            StaticMenuItemFactory.getSupportMenus(),
            StaticMenuItemFactory.getDevMenus()
        ];
    }

    bindMenuActions() {
        const map = new Map();
        map.set("uploadCatchmentDatabase", () => this.uploadCatchmentDatabase());
        map.set("uploadDatabase", () => this.uploadDatabase());
        map.set("changePassword", () => this.changePasswordView());
        map.set("logout", () => this.logout());
        map.set("feedback", () => this.onFeedback());
        map.set("deleteData", () => this.onDelete());
        this.menuActions = map;
    }

    getMenuItems(staticMenuItems, allConfiguredMenuItems, groupName) {
        const Item = (props) => <MenuView.Item I18n={this.I18n} {...props}/>;
        const menuItems = staticMenuItems.map((x) => {
            let eventHandler = x.type === StaticMenuItem.InternalNavigationMenuType ?
                () => TypedTransition.from(this).to(x.typeSpecificConfig) : this.menuActions.get(x.uniqueName);
            return <Item icon={this.icon(x.icon)} titleKey={x.displayKey} onPress={eventHandler}/>
        });

        if (_.isNil(groupName)) return menuItems;

        const groupsConfiguredItems = _.filter(allConfiguredMenuItems, (x) => x.group === groupName);
        groupsConfiguredItems.forEach(configuredMenuItem => {
            if (configuredMenuItem.type === MenuItem.HyperlinkTypeName && !_.isNil(this.state.configuredMenuItemRuleOutput.get(configuredMenuItem.uuid)))
                {
                    const url = this.state.configuredMenuItemRuleOutput.get(configuredMenuItem.uuid);
                    General.logDebug("MenuView.getMenuItems", url);
                    menuItems.push(<Item icon={this.icon(configuredMenuItem.icon)} titleKey={configuredMenuItem.displayKey}
                                                             onPress={() => this.setState({showWebView: true, showUrl: url})}/>);
                }
        });
        return menuItems;
    }

    renderDawaPrapatraContent() {
        return (
            <WebView
                ignoreSslError={true}
                style={{ flex: 1 }}
                originWhitelist={['*']}
                source={{
                    uri: this.state.showUrl,
                    headers: {
                        "AUTH-TOKEN": this.state.authToken,
                    }
                }}
                javaScriptEnabledAndroid={true}
                startInLoadingState={true}
                scalesPageToFit={true}
            />
        );
    }

    render() {
        const {userInfo, configuredMenuItems} = this.state;

        if (_.isNil(userInfo)) return null;

        General.logDebug("MenuView", "render");
        const Item = (props) => <MenuView.Item I18n={this.I18n} {...props}/>;
        const functionalityItems = this.getMenuItems(StaticMenuItemFactory.getFunctionalityMenus(this.beneficiaryModeStatus()), configuredMenuItems, MenuItem.FunctionalityGroupName);
        if (this.getService(NewsService).isAnyNewsAvailable()) {
            const unreadNews = this.getService(NewsService).getUnreadNewsCount();
            functionalityItems.push(this.renderNewsBadge(unreadNews));
        }
        
        const dataGroup = [
            {
                title: 'functionality', data: functionalityItems
            },
            {
                title: 'sync', data: this.getMenuItems(StaticMenuItemFactory.getSyncMenus(), configuredMenuItems, MenuItem.SyncGroupName)
            },
            {
                title: 'user', data: this.getMenuItems(StaticMenuItemFactory.getUserMenus(), configuredMenuItems, MenuItem.UserGroupName)
            },
            {
                title: 'support', data: this.getMenuItems(StaticMenuItemFactory.getSupportMenus(), configuredMenuItems, MenuItem.SupportGroupName)
            },
            {
                title: 'dev', data: this.getMenuItems(StaticMenuItemFactory.getDevMenus(), configuredMenuItems, null)
            }
        ];

        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                {this.renderTitle()}
                <ProgressBarView onPress={_.noop} progress={this.state.percentDone / 100}
                                 message={this.I18n.t(this.state.backupProgressUserMessage)}
                                 syncing={this.state.backupInProgress} notifyUserOnCompletion={false}/>
                { this.state.showWebView && this.renderDawaPrapatraContent() }
                {!this.state.showWebView &&
                <CHSContent>
                    <ScrollView>
                        <SectionList
                            contentContainerStyle={{
                                marginRight: Distances.ScaledContentDistanceFromEdge,
                                marginLeft: Distances.ScaledContentDistanceFromEdge,
                                marginTop: Distances.ScaledContentDistanceFromEdge
                            }}
                            sections={dataGroup}
                            renderSectionHeader={() =>
                                <Separator height={30} backgroundColor={Colors.GreyContentBackground}/>}
                            renderItem={({item}) => item}
                            keyExtractor={(item, index) => index}
                        />
                        <View style={[{
                            marginRight: Distances.ScaledContentDistanceFromEdge,
                            marginLeft: Distances.ScaledContentDistanceFromEdge,
                        }]}>
                            <View style={styles.infoContainer}>
                                <Text style={Styles.textList}>Server: <Text
                                    style={{
                                        color: 'black',
                                        fontSize: Styles.normalTextSize
                                    }}>{this.state.serverURL}</Text></Text>
                                <Text style={Styles.textList}>Database Schema : <Text
                                    style={{
                                        color: 'black',
                                        fontSize: Styles.normalTextSize
                                    }}>{Schema.schemaVersion}</Text></Text>
                                <Text style={Styles.textList}>BuildVersion: <Text
                                    style={{
                                        color: 'black',
                                        fontSize: Styles.normalTextSize
                                    }}>{DeviceInfo.getVersion()}-{Config.COMMIT_ID}</Text></Text>
                            </View>
                        </View>
                    </ScrollView>
                    <Separator height={100} backgroundColor={Colors.GreyContentBackground}/>
                </CHSContent>}
            </CHSContainer>
        );
    }
}

export default MenuView;
const styles = StyleSheet.create({
        container: {
            margin: 4,
            elevation: 2,
            minHeight: 48,
            marginVertical: StyleSheet.hairlineWidth,
            backgroundColor: Colors.cardBackgroundColor,
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'center',
        },
        textContainer: {
            flex: 1,
            paddingVertical: 4,
            padding: Distances.ScaledContentDistanceFromEdge,
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        optionStyle: {
            color: Colors.DefaultPrimaryColor,
            fontWeight: 'normal',
            fontSize: 13,
            alignSelf: 'flex-start',
            textAlignVertical: 'center',
        },
        iconStyle: {
            color: Colors.AccentColor,
            opacity: 0.8,
            alignSelf: 'center',
            fontSize: 40
        },
        infoContainer: {
            padding: Distances.ScaledContentDistanceFromEdge,
            margin: 4,
            elevation: 2,
            backgroundColor: Colors.cardBackgroundColor,
            marginVertical: 16,
        }
    }
);
