import {Alert, Linking, Platform, SafeAreaView, SectionList, StyleSheet, Text, TouchableNativeFeedback, View, ScrollView} from "react-native";
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
import RuleEvaluationService from "../service/RuleEvaluationService";
import Distances from "./primitives/Distances";
import Fonts from "./primitives/Fonts";
import CHSContainer from "./common/CHSContainer";
import Separator from "./primitives/Separator";
import SettingsView from "./settings/SettingsView";
import Styles from "./primitives/Styles";
import DeviceInfo from "react-native-device-info";
import {EntityMappingConfig} from 'openchs-models';
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
import AvniIcon from "./common/AvniIcon";
import EntityService from "../service/EntityService";
import EnvironmentConfig from "../framework/EnvironmentConfig";
import { getAvniError } from "../service/ServerError";
import { AlertMessage } from "./common/AlertMessage";
import MessageService from "../service/MessageService";

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
                    {(['logout', 'Delete Data', 'backup'].includes(titleKey)) ? <View/> :
                        <AvniIcon style={styles.iconStyle} name='chevron-right' type='MaterialIcons'/>
                    }

                </View>
            </TouchableNativeFeedback>)
            : <View/>
    }

    UNSAFE_componentWillMount() {
        this.bindMenuActions();
        super.UNSAFE_componentWillMount();
    }

    componentDidMount() {
        this.dispatchAction(MenuActionNames.ON_LOAD);
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
        authService.getAuthProviderService().logout()
            .then(() => authService.fetchAuthSettingsFromServer())
            .catch((error) => {
                const i18n = this.getService(MessageService).getI18n();
                getAvniError(error, i18n).then(avniError => AlertMessage(i18n.t('Error'), avniError.getDisplayMessage()));
            })
            .then(() => {
                logEvent(firebaseEvents.LOG_OUT);
                CHSNavigator.navigateToLoginView(this, false);
            })
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

    deleteData() {
        this.getService(AuthService).getAuthProviderService().logout()
            .then(() => this.getService(SyncService).clearData())
            .then(() => this.getService(SyncService).reset(true))
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

    createAnonymizedDatabase() {
        this.dispatchAction(MenuActionNames.ON_ANONYMIZE_DB, {
            onAnonymizeDBCb: (percentDone, message) => this.dispatchAction(MenuActionNames.ON_ANONYMIZE_PROGRESS, {
                percentDone: percentDone,
                message: message
            })
        });
    }

    onNews() {
        TypedTransition.from(this).to(NewsListView);
    }

    background() {
        return Platform['Version'] >= 21 ?
            TouchableNativeFeedback.SelectableBackgroundBorderless() :
            TouchableNativeFeedback.SelectableBackground();
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
                <AvniIcon style={styles.iconStyle} name='chevron-right' type='MaterialIcons'/>
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
                    minHeight: 70,
                    elevation: 3,
                    paddingHorizontal: 16,
                    paddingVertical: 8
                }}>
                    <MCIIcon style={{fontSize: 35, color: Colors.headerIconColor, alignSelf: 'center'}}
                             name={'user-circle'}/>
                    <View style={{flexDirection: 'column', alignSelf: 'center', marginLeft: 20, flex: 1}}>
                        <View style={{flexDirection: 'row'}}>
                            <Text style={[{
                                color: Colors.headerTextColor,
                                fontSize: Fonts.Large,
                                flexWrap: 'wrap',
                            }]}>{this.state.userInfo.organisationName ?
                                this.state.userInfo.username ?
                                    `${this.state.userInfo.username} - ${this.state.userInfo.name} (${this.state.userInfo.organisationName})`
                                    : this.state.userInfo.organisationName
                                : this.I18n.t('syncRequired')
                            }</Text>
                        </View>
                        <Text style={[{
                            color: Colors.headerTextColor,
                            fontSize: 12,
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

    bindMenuActions() {
        const map = new Map();
        map.set("uploadCatchmentDatabase", () => this.uploadCatchmentDatabase());
        map.set("uploadDatabase", () => this.uploadDatabase());
        map.set("changePassword", () => this.changePasswordView());
        map.set("logout", () => this.logout());
        map.set("deleteData", () => this.onDelete());
        map.set("createAnonymizedDatabase", () => this.createAnonymizedDatabase());
        this.menuActions = map;
    }

    openRuleEvaluatedUrl(menuItem) {
        const authService = this.context.getService(AuthService);
        const ruleEvaluationService = this.context.getService(RuleEvaluationService);
        authService.getAuthProviderService().getAuthToken().then((authToken) => {
            const evaluatedLink = ruleEvaluationService.evaluateLinkFunction(menuItem.linkFunction, menuItem, this.state.userInfo, authToken);
            General.logDebug("MenuView", `Opening URL: ${evaluatedLink}`);
            Linking.openURL(evaluatedLink);
        });
    }

    getMenuItems(staticMenuItems, allConfiguredMenuItems, groupName) {
        const Item = (props) => <MenuView.Item I18n={this.I18n} {...props}/>;
        const menuItems = staticMenuItems.map((x) => {
            let eventHandler = x.type === StaticMenuItem.InternalNavigationMenuType ?
                () => TypedTransition.from(this).to(x.typeSpecificConfig) : this.menuActions.get(x.uniqueName);
            return <Item icon={this.icon(x.icon)} titleKey={x.displayKey} onPress={eventHandler}/>
        });

        const groupsConfiguredLinkMenuItems = _.filter(allConfiguredMenuItems, (x) => !_.isNil(groupName) &&
                                                                x.group === groupName && x.type === MenuItem.HyperlinkTypeName);
        groupsConfiguredLinkMenuItems.forEach(configuredMenuItem =>
                menuItems.push(<Item icon={this.icon(configuredMenuItem.icon)} titleKey={configuredMenuItem.displayKey}
                                 onPress={() => this.openRuleEvaluatedUrl(configuredMenuItem)}/>)
        );
        return menuItems;
    }

    render() {
        const {userInfo, configuredMenuItems} = this.state;

        if (_.isNil(userInfo)) return null;

        General.logDebug("MenuView", "render");
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
                title: 'sync', data: this.getMenuItems(StaticMenuItemFactory.getSyncMenus(this.context), configuredMenuItems, MenuItem.SyncGroupName)
            },
            {
                title: 'user', data: this.getMenuItems(StaticMenuItemFactory.getUserMenus(), configuredMenuItems, MenuItem.UserGroupName)
            },
            {
                title: 'support', data: this.getMenuItems(StaticMenuItemFactory.getSupportMenus(this.context), configuredMenuItems, MenuItem.SupportGroupName)
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
                <ScrollView>
                    <CHSContent>
                        <SafeAreaView>
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
                                        }}>{this.getService(EntityService).getActualSchemaVersion()}</Text></Text>
                                    {!EnvironmentConfig.isProd() && <Text style={Styles.textList}>Code Schema Version: <Text
                                        style={{
                                            color: 'black',
                                            fontSize: Styles.normalTextSize
                                        }}>{EntityMappingConfig.getInstance().getSchemaVersion()}</Text></Text>}
                                    <Text style={Styles.textList}>BuildVersion: <Text
                                        style={{
                                            color: 'black',
                                            fontSize: Styles.normalTextSize
                                        }}>{DeviceInfo.getVersion()}-{Config.COMMIT_ID}</Text></Text>
                                </View>
                            </View>
                        </SafeAreaView>
                        <Separator height={100} backgroundColor={Colors.GreyContentBackground}/>
                    </CHSContent>
                </ScrollView>

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
