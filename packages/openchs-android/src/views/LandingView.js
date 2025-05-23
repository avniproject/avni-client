import PropTypes from 'prop-types';
import React from "react";
import Path from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import CHSContainer from "./common/CHSContainer";
import AvniIcon from "./common/AvniIcon";
import CHSNavigator from "../utility/CHSNavigator";
import AuthService from "../service/AuthService";
import bugsnag from "../utility/bugsnag";
import General from "../utility/General";
import {LandingViewActionsNames as Actions} from "../action/LandingViewActions";
import Reducers from "../reducer";
import Styles from "./primitives/Styles";
import MyDashboardView from "./mydashbaord/MyDashboardView";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import EntityService from "../service/EntityService";
import {SubjectType} from "avni-models";
import _ from "lodash";
import Colors from "./primitives/Colors";
import RegisterView from "./RegisterView";
import AbstractComponent from "../framework/view/AbstractComponent";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import EntypoIcon from "react-native-vector-icons/Entypo";
import PrivilegeService from "../service/PrivilegeService";
import CustomDashboardView from "./customDashboard/CustomDashboardView";
import NewsService from "../service/news/NewsService";
import { Dimensions } from 'react-native';
import LocalCacheService from '../service/LocalCacheService';
import {CustomDashboardType} from "../service/customDashboard/CustomDashboardService";

@Path('/landingView')
class LandingView extends AbstractComponent {
    static propTypes = {
        menuProps: PropTypes.object
    };

    static layoutConstants = {
        bottomBarHeight: 80,
        itemHeight: 70,
        textContainerHeight: 24,
        iconSize: 30,
        iconMarginBottom: 4,
        minItemWidth: 80,
        textWidthRatio: 0.9,
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.landingView);
    }

    viewName() {
        return "LandingView";
    }

    UNSAFE_componentWillMount() {
        LocalCacheService.getPreviouslySelectedSubjectTypeUuid().then(cachedSubjectTypeUUID => {
            this.dispatchAction(Actions.ON_LOAD, {cachedSubjectTypeUUID});
        });
        const authService = this.context.getService(AuthService);
        authService.getAuthProviderService().getUserName().then(username => {
            bugsnag.setUser(username, username, username);
        });

        return super.UNSAFE_componentWillMount();
    }

    renderBottomBarItem(icon, menuMessageKey, pressHandler, isSelected, idx, itemWidth) {
        const { layoutConstants } = LandingView;
        return _.isNil(menuMessageKey) ? null : (
            <View key={idx} style={{
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                paddingVertical: 5,
                borderBottomWidth: isSelected ? 2 : 0,
                borderColor: isSelected ? Colors.iconSelectedColor : 'transparent',
                width: itemWidth,
                height: layoutConstants.itemHeight,
            }}
            >
                <TouchableOpacity style={{height: layoutConstants.iconSize,
                    width: layoutConstants.iconSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: layoutConstants.iconMarginBottom,
                }}
                                  onPress={pressHandler}
                >
                    {icon}
                </TouchableOpacity>
                <View
                    style={{
                        width: itemWidth * layoutConstants.textWidthRatio,
                        height: layoutConstants.textContainerHeight,
                        justifyContent: 'flex-start'
                    }}
                >
                    <Text
                        style={{
                            fontSize: Styles.smallerTextSize - 1,
                            fontStyle: 'normal',
                            color: isSelected ? Colors.iconSelectedColor : Colors.bottomBarIconColor,
                            textAlign: 'center',
                            lineHeight: 12,
                        }}
                    >
                        {menuMessageKey}
                    </Text>
                </View>
            </View>
        );
    }

    Icon(iconName, iconStyle, isSelected, renderDot = false, iconType = 'MaterialCommunityIcons') {
        const style = iconStyle ? (isSelected ? {
            ...iconStyle,
            color: Colors.iconSelectedColor
        } : iconStyle) : MenuView.iconStyle;
        return renderDot ? this.IconWithDot(iconName, style) : <AvniIcon name={iconName} style={style} type={iconType} />;
    }

    IconWithDot(iconName, iconStyle) {
        return (<View style={{flexDirection: 'row', flex: 1}}>
                <MCIIcon name={iconName} style={[iconStyle, {fontSize: 30}]} />
                <EntypoIcon
                    name={'dot-single'}
                    style={{fontSize: 25, color: Colors.BadgeColor, position: 'absolute', top: -6, right: -6}}
                />
            </View>
        );
    }

    static barIconStyle = {color: Colors.bottomBarIconColor, opacity: 0.8, alignSelf: 'center', fontSize: 33};

    renderCustomDashboard(startSync) {
        return (
            <CustomDashboardView
                startSync={startSync && this.state.syncRequired}
                icon={(name, style) => this.Icon(name, style)}
                title={'home'}
                hideBackButton={true}
                renderSync={true}
                customDashboardType={CustomDashboardType.Primary}
                onSearch={() => this.dispatchAction(Actions.ON_SEARCH_CLICK)}
                showSearch={true}
            />
        );
    }

    renderDefaultDashboard(startSync) {
        return (
            <MyDashboardView
                startSync={startSync && this.state.syncRequired}
                icon={(name, style) => this.Icon(name, style)}
                onSearch={() => this.dispatchAction(Actions.ON_SEARCH_CLICK)}
            />
        );
    }

    renderDashboard(startSync) {
        return this.state.renderCustomDashboard ? this.renderCustomDashboard(startSync) : this.renderDefaultDashboard(startSync);
    }

    render() {
        General.logDebug("LandingView", "render");

        const {previouslySelectedSubjectTypeUUID, register, search, menu, home, dashboard, secondaryDashboard, secondaryDashboardSelected} = this.state;

        const displayRegister = this.context.getService(PrivilegeService).displayRegisterButton();
        const startSync = _.isNil(this.props.menuProps) ? false : this.props.menuProps.startSync;
        const subjectTypes = this.context.getService(EntityService).findAll(SubjectType.schema.name);
        const previouslySelectedSubjectType = LocalCacheService.getPreviouslySelectedSubjectType(subjectTypes, previouslySelectedSubjectTypeUUID);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : previouslySelectedSubjectType.registerIcon();
        const renderDot = this.getService(NewsService).isUnreadMoreThanZero();
        const registerMenuItem = displayRegister ? [
            this.Icon(registerIcon, LandingView.barIconStyle, register),
            this.I18n.t("register"),
            previouslySelectedSubjectType && (() => this.dispatchAction(Actions.ON_REGISTER_CLICK)),
            register
        ] : [];
        const moreMenu = [
            this.Icon("menu", LandingView.barIconStyle, menu, renderDot),
            this.I18n.t("More"),
            () => this.dispatchAction(Actions.ON_MENU_CLICK),
            menu
        ];
        const bottomBarIcons = [
            [this.Icon("home", LandingView.barIconStyle, home), this.I18n.t("home"), () => this.dispatchAction(Actions.ON_HOME_CLICK), home]
        ];
        if (!_.isNil(secondaryDashboard)) {
            bottomBarIcons.push([this.Icon("dashboard", LandingView.barIconStyle, secondaryDashboardSelected, false, "MaterialIcons"),
                this.I18n.t(secondaryDashboard.name),
                () => this.dispatchAction(Actions.ON_SECONDARY_DASHBOARD_CLICK),
                secondaryDashboardSelected
            ]);
        }
        bottomBarIcons.push(registerMenuItem);
        bottomBarIcons.push(moreMenu);

        const screenWidth = Dimensions.get('window').width;
        const itemWidth = Math.max(screenWidth / bottomBarIcons.length, LandingView.layoutConstants.minItemWidth);

        return (
            <CHSContainer>
                {home && this.renderDashboard(startSync)}
                {search && <IndividualSearchView
                    onIndividualSelection={(source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)}
                    buttonElevated={true}
                    hideBackButton={true}/>}
                {register && <RegisterView hideBackButton={true}/>}
                {menu && <MenuView menuIcon={(name, style) => this.Icon(name, style)}/>}
                {secondaryDashboardSelected && <CustomDashboardView
                    startSync={startSync && this.state.syncRequired}
                    icon={(name, style) => this.Icon(name, style)}
                    title={'home'}
                    hideBackButton={true}
                    renderSync={true}
                    customDashboardType={CustomDashboardType.Secondary}
                    onSearch={() => this.dispatchAction(Actions.ON_SEARCH_CLICK)}
                />}

                <View style={{
                    height: LandingView.layoutConstants.bottomBarHeight,
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    backgroundColor: Colors.bottomBarColor,
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    elevation: 3,
                    alignItems: 'center',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: Colors.Separator
                }}>
                    {bottomBarIcons.map(([icon, display, cb, isSelected], idx) => this.renderBottomBarItem(icon, display, cb, isSelected, idx, itemWidth))}
                </View>
            </CHSContainer>
        );
    }
}

export default LandingView;