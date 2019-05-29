import AbstractComponent from "../framework/view/AbstractComponent";
import React from "react";
import {View, ScrollView, Text, TouchableOpacity} from "react-native";
import CHSContent from "./common/CHSContent";
import Path from "../framework/routing/Path";
import Styles from "./primitives/Styles";
import CHSContainer from "./common/CHSContainer";
import MenuView from "./MenuView";
import General from "../utility/General";
import EntityService from "../service/EntityService";
import {SubjectType} from "openchs-models";
import _ from "lodash";
import DynamicGlobalStyles from "./primitives/DynamicGlobalStyles";

@Path('/menuListView')
class MenuListView extends AbstractComponent {

    viewName() {
        return "MenuListView";
    }

    componentWillMount() {
        super.componentWillMount();
    }

    renderMenuItem = (maxLength) => (icon, menuMessageKey, pressHandler, idx) => {
        let pad = _.pad(menuMessageKey, 2 * Math.round(maxLength / 2), ' ');
        return (<View key={idx} style={{
            marginHorizontal: DynamicGlobalStyles.resizeWidth(29),
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: DynamicGlobalStyles.resizeWidth(71),
            flexDirection: 'column'
        }}>
            <TouchableOpacity style={{height: 84, width: 84, justifyContent: 'flex-end'}} onPress={pressHandler}>
                {icon}
            </TouchableOpacity>
            <Text style={Styles.menuTitle}>{pad}</Text>
        </View>)
    };

    render() {
        General.logDebug("MenuListView", "render");
        const subjectTypes = this.context.getService(EntityService).getAll(SubjectType.schema.name);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : subjectTypes[0].registerIcon();
        const registerMenuItem = !this.props.params.hideRegister ? [[this.props.params.icon(registerIcon), this.I18n.t("register"), subjectTypes[0] && this.props.params.register]] : [];
        let otherMenuItems = [
            [this.props.params.icon("view-list"), this.I18n.t("myDashboard"), this.props.params.myDashboard],
            [this.props.params.icon("account-multiple"), "Family Folder", this.props.params.familyFolder, () => __DEV__],
            [this.props.params.icon("video-library"), this.I18n.t("VideoList"), this.props.params.videoListView],
            [this.props.params.syncIcon(), this.I18n.t("syncData"), this.props.params.sync],
            [this.props.params.icon("logout"), this.I18n.t("logout"), this.props.params.logout],
            [this.props.params.icon("account-key"), this.I18n.t("changePassword"), this.props.params.changePasswordView],

            [this.props.params.icon("settings"), this.I18n.t("settings"), this.props.params.settingsView],
            [this.props.params.icon("delete"), "Delete Data", this.props.params.onDelete, () => __DEV__]
        ];
        const menuItemsData = _.concat(registerMenuItem, otherMenuItems);
        const maxMenuItemDisplay = _.maxBy(menuItemsData, ([i, d, j]) => d.length)[1].length;
        const allIcons = menuItemsData
            .filter(([icon, display, cb, shouldRender]) => shouldRender === undefined || shouldRender())
            .map(([icon, display, cb], idx) => this.renderMenuItem(maxMenuItemDisplay)(icon, display, cb, idx));

        return (
            <CHSContainer style={{backgroundColor: Styles.defaultBackground}}>
                <CHSContent>
                    <View style={{
                        paddingBottom: 70,
                    }}>
                        <ScrollView style={{
                            backgroundColor: Styles.defaultBackground
                        }} contentContainerStyle={{
                            flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {allIcons}
                        </ScrollView>
                    </View>
                </CHSContent>
                <MenuView moreSelected={true}/>
            </CHSContainer>
        );
    }
}

export default MenuListView
