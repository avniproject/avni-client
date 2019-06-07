import {
    Alert, Platform,
    SectionList, StyleSheet,
    Text,
    TouchableNativeFeedback,
    View,
    ScrollView
} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import Path from "../framework/routing/Path";
import TypedTransition from "../framework/routing/TypedTransition";
import FamilyFolderView from "./familyfolder/FamilyFolderView";
import VideoListView from "./videos/VideoListView";
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
import EntitySyncStatusView from "./entitysyncstatus/EntitySyncStatusView";
import DevSettingsView from "./settings/DevSettingsView";
import UserInfoService from "../service/UserInfoService";
import SettingsView from "./settings/SettingsView";
import Styles from "./primitives/Styles";
import DeviceInfo from "react-native-device-info";
import {Schema} from 'openchs-models';
import SettingsService from "../service/SettingsService";
import MCIIcon from "react-native-vector-icons/FontAwesome";

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        menuIcon: PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
        const settings = context.getService(SettingsService).getSettings();
        this.state = {
            userInfo: context.getService(UserInfoService).getUserInfo(),
            serverURL: settings.serverURL
        };
    }

    viewName() {
        return "MenuView";
    }

    static iconStyle = {color: Colors.DefaultPrimaryColor, opacity: 0.8, alignSelf: 'center', fontSize: 20, padding: 8};

    changePasswordView() {
        CHSNavigator.navigateToChangePasswordView(this);
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

    familyFolder() {
        TypedTransition.from(this).to(FamilyFolderView);
    }

    videoListView() {
        TypedTransition.from(this).to(VideoListView);
    }

    entitySyncStatusView() {
        TypedTransition.from(this).to(EntitySyncStatusView);
    }

    devSettingsView() {
        TypedTransition.from(this).to(DevSettingsView);
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
        this.getService(AuthService).clearData().then(() => this.reset());
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

    background() {
        return Platform['Version'] >= 21 ?
            TouchableNativeFeedback.SelectableBackgroundBorderless() :
            TouchableNativeFeedback.SelectableBackground();
    }

    renderItem(menuOption) {
        const [icon, menuMessageKey, pressHandler, shouldRender] = menuOption.item;
        return (shouldRender === undefined || shouldRender()) ?
            (<TouchableNativeFeedback onPress={pressHandler}
                                      background={TouchableNativeFeedback.SelectableBackground()}>
                <View
                    style={styles.container}>
                    {icon}
                    <View style={styles.textContainer}>
                        <Text
                            style={[Fonts.typography("paperFontSubhead"), styles.optionStyle]}>{menuMessageKey}</Text>
                    </View>
                    {(menuMessageKey === 'Logout' || menuMessageKey === 'Delete Data') ? <View/> :
                        <Icon style={styles.iconStyle} name='chevron-right'/>}
                </View>
            </TouchableNativeFeedback>)
            : <View/>
    }

    renderTitle() {
        return (
            <TouchableNativeFeedback onPress={() => this.userSettingsView()}
                                     background={this.background()}>
                <View style={{
                    backgroundColor: Colors.headerBackgroundColor,
                    flexDirection: 'row',
                    height: 56,
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

    render() {
        General.logDebug("MenuView", "render");
        const dataGroup1 = [
            {
                title: 'otherItems', data: [
                    [this.props.menuIcon("video-library", MenuView.iconStyle), this.I18n.t("VideoList"), this.videoListView.bind(this)],
                    [this.props.menuIcon("sync", MenuView.iconStyle), this.I18n.t("entitySyncStatus"), this.entitySyncStatusView.bind(this)]
                ]
            },
            {
                title: 'changePass-logout', data: [
                    [this.props.menuIcon("account-key", MenuView.iconStyle), this.I18n.t("changePassword"), this.changePasswordView.bind(this)],
                    [this.props.menuIcon("logout", [MenuView.iconStyle, {color: Colors.NegativeActionButtonColor}]), this.I18n.t("logout"), this.logout.bind(this)]
                ]
            },
            {
                title: 'dev', data: [
                    [this.props.menuIcon("delete", [MenuView.iconStyle, {color: Colors.NegativeActionButtonColor}]), "Delete Data", this.onDelete.bind(this), () => __DEV__],
                    [this.props.menuIcon("account-multiple", MenuView.iconStyle), "Family Folder", this.familyFolder.bind(this), () => __DEV__],
                    [this.props.menuIcon("settings", MenuView.iconStyle), "Dev Settings", this.devSettingsView.bind(this), () => __DEV__],
                ]
            }
        ];


        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                {this.renderTitle()}
                <CHSContent>
                    <ScrollView>
                        <SectionList
                            contentContainerStyle={{
                                marginRight: Distances.ScaledContentDistanceFromEdge,
                                marginLeft: Distances.ScaledContentDistanceFromEdge,
                                marginTop: Distances.ScaledContentDistanceFromEdge
                            }}
                            sections={dataGroup1}
                            renderSectionHeader={() => <Separator height={30}
                                                                  backgroundColor={Colors.GreyContentBackground}/>}
                            renderItem={(data) => this.renderItem(data)}
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
                                    }}>{DeviceInfo.getVersion()}</Text></Text>
                            </View>
                        </View>
                    </ScrollView>
                    <Separator height={100} backgroundColor={Colors.GreyContentBackground}/>
                </CHSContent>
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
            backgroundColor: '#fefefe',
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
            backgroundColor: '#fefefe',
            marginVertical: 16,
        }
    }
);
