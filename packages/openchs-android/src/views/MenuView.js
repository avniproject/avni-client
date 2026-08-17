import {Linking, Platform, SafeAreaView, SectionList, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import Path from "../framework/routing/Path";
import TypedTransition from "../framework/routing/TypedTransition";
import CHSNavigator from "../utility/CHSNavigator";
import General from "../utility/General";
import AppHeader from "./common/AppHeader";
import Colors from "./primitives/Colors";
import AuthService from "../service/AuthService";
import RuleEvaluationService from "../service/RuleEvaluationService";
import Distances from "./primitives/Distances";
import Fonts from "./primitives/Fonts";
import CHSContainer from "./common/CHSContainer";
import SettingsView from "./settings/SettingsView";
import Styles from "./primitives/Styles";
import DeviceInfo from "react-native-device-info";
import {EntityMappingConfig} from 'openchs-models';
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
import CustomConfirmDialog from "./common/CustomConfirmDialog";

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        menuIcon: PropTypes.func
    };
    static iconStyle = {color: Colors.TextHint, alignSelf: 'center', fontSize: 24, padding: 8};

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

    onViewDidMount() {
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
        CustomConfirmDialog.show({
            title: this.I18n.t("logoutConfirmationTitle"),
            message: this.I18n.t("logoutConfirmationMessage"),
            yesLabel: this.I18n.t('logoutConfirmed'),
            noLabel: this.I18n.t('logoutCancelled'),
            onYes: this._logout,
            onNo: _.noop
        });
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
        CustomConfirmDialog.show({
            title: this.I18n.t('deleteSchemaNoticeTitle'),
            message: this.I18n.t('deleteSchemaConfirmationMessage'),
            yesLabel: this.I18n.t('yes'),
            noLabel: this.I18n.t('no'),
            onYes: () => this.deleteData(),
            onNo: _.noop
        });
    };

    uploadCatchmentDatabase() {
        if (!this.state.oneSyncCompleted || this.state.unsyncedTxData) {
            CustomConfirmDialog.showAlert({
                title: this.I18n.t('uploadCatchmentDatabaseErrorTitle'),
                message: this.getCatchmentUploadErrorMessage(),
                okLabel: this.I18n.t('ok')
            });
        } else {
            this.startUploadDatabase('uploadCatchmentDatabase', 'uploadCatchmentDatabaseConfirmationMessage', MediaQueueService.DumpType.Catchment);
        }
    };

    uploadAppInfo() {
        this.startUploadDatabase('uploadAppInfo', 'uploadAppInfoConfirmationMessage', MediaQueueService.DumpType.Adhoc);
    }

    startUploadDatabase(titleKey, messageKey, dumpType) {
        CustomConfirmDialog.show({
            title: this.I18n.t(titleKey),
            message: this.I18n.t(messageKey),
            yesLabel: this.I18n.t('yes'),
            noLabel: this.I18n.t('no'),
            onYes: () => {
                this.dispatchAction(MenuActionNames.ON_BACKUP_DUMP, {
                    dumpType: dumpType,
                    onBackupDumpCb: (percentDone, message, avniError) => {
                        this.dispatchAction(MenuActionNames.ON_BACKUP_PROGRESS, {
                            percentDone: percentDone,
                            message: message
                        });
                        if (percentDone === 100) {
                            if (message === "backupCompleted") {
                                CustomConfirmDialog.showAlert({title: this.I18n.t('uploadSuccessful')});
                            } else if (message === "backupFailed") {
                                this.showBackupFailedAlert(avniError);
                            }
                        }
                    }
                });
            },
            onNo: () => {
            }
        });
    }

    showBackupFailedAlert(avniError) {
        CustomConfirmDialog.showAlert({
            title: this.I18n.t('uploadFailed'),
            message: avniError ? avniError.getDisplayMessage() : ""
        });
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

    renderHeader() {
        return <AppHeader title={this.I18n.t('More')} hideBackButton={true} hideIcon={true}/>;
    }

    // Same organisationName/username/name fallback rules as before, just split across
    // heading + chip + subtext instead of one concatenated header string.
    renderUserCard() {
        const {organisationName, username, name} = this.state.userInfo;
        const heading = organisationName ? (username ? (name || username) : organisationName) : this.I18n.t('syncRequired');
        const showChip = !!organisationName && !!username;
        const showOrgSubtext = !!organisationName && !!username;

        return (
            <View style={styles.userCardWrapper}>
                <TouchableNativeFeedback onPress={() => this.userSettingsView()}
                                         background={this.background()}>
                    <View style={styles.userCard}>
                        <View style={styles.userCardIconContainer}>
                            <AvniIcon name='account-outline' type='MaterialCommunityIcons' style={styles.userCardIcon}/>
                        </View>
                        <View style={styles.userCardTextContainer}>
                            <Text style={styles.userCardHeading} numberOfLines={1}>{heading}</Text>
                            {showChip && <View style={styles.userCardChip}>
                                <Text style={styles.userCardChipText} numberOfLines={1}>{username}</Text>
                            </View>}
                            {showOrgSubtext && <Text style={styles.userCardSubtext} numberOfLines={1}>{organisationName}</Text>}
                            <Text style={styles.userCardEditText}>{this.I18n.t('editSettings')}</Text>
                        </View>
                    </View>
                </TouchableNativeFeedback>
            </View>);
    }

    renderInfoRow(label, value, isFirst = false) {
        return <View style={[styles.infoRow, !isFirst && styles.infoRowDivider]}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>;
    }

    onMetabaseReportClick() {
        const questionURL = "https://reporting.avniproject.org/public/question/11265388-5909-438e-9d9a-6faaa0c5863f";
        const params = `?username=${encodeURIComponent(this.state.userInfo.username)}&name=${encodeURIComponent(this.state.userInfo.name)}&month=${moment().month() + 1}&year=${moment().year()}`;
        Linking.openURL(`${questionURL}${params}`);
    }

    bindMenuActions() {
        const map = new Map();
        map.set("uploadCatchmentDatabase", () => this.uploadCatchmentDatabase());
        map.set("uploadAppInfo", () => this.uploadAppInfo());
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
                {this.renderHeader()}
                <ProgressBarView onPress={_.noop} progress={this.state.percentDone / 100}
                                 message={this.I18n.t(this.state.backupProgressUserMessage)}
                                 syncing={this.state.backupInProgress} notifyUserOnCompletion={false}/>
                <SafeAreaView style={{flex: 1}}>
                    {/* The user card used to sit fixed above a ScrollView wrapping this SectionList - nesting a
                        VirtualizedList inside a ScrollView caused the list content to scroll independently and
                        visually pass behind the fixed card. Rendering the card as ListHeaderComponent (and the
                        info block as ListFooterComponent) makes the whole screen one scrollable surface. */}
                    <SectionList
                        contentContainerStyle={{
                            marginRight: Distances.ScaledContentDistanceFromEdge,
                            marginLeft: Distances.ScaledContentDistanceFromEdge,
                            marginTop: Distances.ScaledContentDistanceFromEdge,
                            paddingBottom: 100
                        }}
                        ListHeaderComponent={() => this.renderUserCard()}
                        sections={dataGroup}
                        renderItem={({item}) => item}
                        keyExtractor={(item, index) => index}
                        ListFooterComponent={() => (
                            <View style={styles.infoContainer}>
                                {this.renderInfoRow('Server', this.state.serverURL, true)}
                                {this.renderInfoRow('Database Schema', this.getService(EntityService).getActualSchemaVersion())}
                                {!EnvironmentConfig.isProd() && this.renderInfoRow('Code Schema Version', EntityMappingConfig.getInstance().getSchemaVersion())}
                                {this.renderInfoRow('Build Version', `${DeviceInfo.getVersion()}-${Config.COMMIT_ID}`)}
                            </View>
                        )}
                    />
                </SafeAreaView>
            </CHSContainer>
        );
    }
}

export default MenuView;
const styles = StyleSheet.create({
        container: {
            marginHorizontal: 4,
            marginVertical: 6,
            minHeight: 56,
            borderRadius: 16,
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
            color: Colors.TextPrimaryDark,
            fontWeight: 'normal',
            fontSize: Styles.normalTextSize,
            alignSelf: 'flex-start',
            textAlignVertical: 'center',
        },
        iconStyle: {
            color: Colors.TextHint,
            alignSelf: 'center',
            fontSize: 24
        },
        infoContainer: {
            padding: 16,
            backgroundColor: Colors.WhiteContentBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.BorderDefault,
            marginVertical: 16,
        },
        infoRow: {
            paddingVertical: 10,
        },
        infoRowDivider: {
            borderTopWidth: 1,
            borderTopColor: Colors.BorderDefault,
        },
        infoLabel: {
            fontSize: Styles.smallerTextSize,
            color: Colors.SecondaryText,
            marginBottom: 2,
        },
        infoValue: {
            fontSize: Styles.normalTextSize,
            color: Colors.TextPrimaryDark,
            fontWeight: '500',
        },
        userCardWrapper: {
            backgroundColor: Colors.GreyContentBackground
        },
        userCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: Colors.WhiteContentBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.BorderDefault,
            marginBottom: Distances.ScaledContentDistanceFromEdge,
            padding: 16
        },
        userCardIconContainer: {
            height: 56,
            width: 56,
            borderRadius: 28,
            backgroundColor: Colors.BrandLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16
        },
        userCardIcon: {
            fontSize: 32,
            color: Colors.BrandPrimaryDark
        },
        userCardTextContainer: {
            flex: 1,
            flexDirection: 'column'
        },
        userCardHeading: {
            fontSize: Styles.normalTextSize,
            fontWeight: '600',
            color: Colors.TextPrimaryDark
        },
        userCardChip: {
            alignSelf: 'flex-start',
            backgroundColor: Colors.BrandLight,
            borderRadius: 100,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginTop: 6
        },
        userCardChipText: {
            fontSize: Styles.smallerTextSize,
            color: Colors.BrandPrimaryDark
        },
        userCardSubtext: {
            fontSize: Styles.smallerTextSize,
            color: Colors.SecondaryText,
            marginTop: 6
        },
        userCardEditText: {
            fontSize: Styles.smallerTextSize,
            color: Colors.BrandPrimaryDark,
            marginTop: 6
        }
    }
);
