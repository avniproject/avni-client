import {Alert, Dimensions, Modal, NetInfo, Text, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import _ from "lodash";
import Path from "../framework/routing/Path";
import TypedTransition from "../framework/routing/TypedTransition";
import DynamicGlobalStyles from "../views/primitives/DynamicGlobalStyles";
import FamilyFolderView from "./familyfolder/FamilyFolderView";
import VideoListView from "./videos/VideoListView";
import CHSNavigator from "../utility/CHSNavigator";
import General from "../utility/General";
import CHSContent from "./common/CHSContent";
import Styles from "./primitives/Styles";
import Colors from "./primitives/Colors";
import AuthService from "../service/AuthService";

@Path('/menuView')
class MenuView extends AbstractComponent {
    static propType = {
        menuIcon: PropTypes.func
    };

    constructor(props, context) {
        super(props, context);
        this.createStyles();
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
    }

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

    renderMenuItem = (maxLength) => (icon, menuMessageKey, pressHandler, idx) => {
        let pad = _.pad(menuMessageKey, 2 * Math.round(maxLength / 2), ' ');
        return (<View key={idx} style={this.columnStyle}>
            <TouchableOpacity style={{height: 84, width: 84, justifyContent: 'flex-end'}} onPress={pressHandler}>
                {icon}
            </TouchableOpacity>
            <Text style={Styles.menuTitle}>{pad}</Text>
        </View>);
    };

    render() {
        General.logDebug("MenuView", "render");
        let menuItemsData = [
            [this.props.menuIcon("account-multiple", MenuView.iconStyle), "Family Folder", this.familyFolder.bind(this), () => __DEV__],
            [this.props.menuIcon("video-library", MenuView.iconStyle), this.I18n.t("VideoList"), this.videoListView.bind(this)],
            [this.props.menuIcon("logout", MenuView.iconStyle), this.I18n.t("logout"), this.logout.bind(this)],
            [this.props.menuIcon("account-key", MenuView.iconStyle), this.I18n.t("changePassword"), this.changePasswordView.bind(this)],
            [this.props.menuIcon("delete", MenuView.iconStyle), "Delete Data", this.onDelete.bind(this), () => __DEV__]
        ];
        const maxMenuItemDisplay = _.maxBy(menuItemsData, ([i, d, j]) => d.length)[1].length;
        const MenuItems = menuItemsData
            .filter(([icon, display, cb, shouldRender]) => shouldRender === undefined || shouldRender())
            .map(([icon, display, cb], idx) => this.renderMenuItem(maxMenuItemDisplay)(icon, display, cb, idx));
        return (
            <CHSContent>
                <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
                    justifyContent: 'center', backgroundColor: Styles.defaultBackground,
                    height: Dimensions.get('window').height
                }}>
                    {MenuItems}
                </View>
            </CHSContent>
        );
    }
}

export default MenuView;
