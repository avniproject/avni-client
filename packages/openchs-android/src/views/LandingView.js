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
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from "react-native";
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
        const componentMountTime = new Date();
        General.logDebug('LandingView', 'UNSAFE_componentWillMount started');
        LocalCacheService.getPreviouslySelectedSubjectTypeUuid().then(cachedSubjectTypeUUID => {
            General.logDebug('LandingView', `Retrieved cached subject type UUID: ${cachedSubjectTypeUUID}, took ${new Date() - componentMountTime} ms`);
            General.logDebug('LandingView', `About to dispatch ON_LOAD action with cachedSubjectTypeUUID: ${cachedSubjectTypeUUID}`);
            this.dispatchAction(Actions.ON_LOAD, {cachedSubjectTypeUUID});
            General.logDebug('LandingView', 'ON_LOAD action dispatched successfully');
        });
        const authService = this.context.getService(AuthService);
        authService.getAuthProviderService().getUserName().then(username => {
            bugsnag.setUser(username, username, username);
        });

        const result = super.UNSAFE_componentWillMount();
        General.logDebug('LandingView', `UNSAFE_componentWillMount completed, total time: ${new Date() - componentMountTime} ms`);
        return result;
    }

    renderBottomBarItem(icon, menuMessageKey, pressHandler, isSelected, idx, itemWidth) {
        const { layoutConstants } = LandingView;
        const wrappedPressHandler = () => {
            const buttonPressTime = new Date();
            General.logWarn('LandingView', `BUTTON TOUCH DETECTED: ${menuMessageKey} at ${buttonPressTime.toISOString()}`);
            General.logDebug('LandingView', `Button pressed: ${menuMessageKey}, isSelected: ${isSelected}, idx: ${idx}`);
            if (pressHandler) {
                try {
                    General.logDebug('LandingView', `Calling press handler for ${menuMessageKey}...`);
                    pressHandler();
                    General.logDebug('LandingView', `Button action completed for ${menuMessageKey}, took ${new Date() - buttonPressTime} ms`);
                } catch (error) {
                    General.logError('LandingView', `Button action failed for ${menuMessageKey}: ${error.message}, stack: ${error.stack}`);
                }
            } else {
                General.logWarn('LandingView', `No press handler for button: ${menuMessageKey}`);
            }
        };
        return _.isNil(menuMessageKey) ? null : (
            <TouchableOpacity key={idx} style={{
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                paddingVertical: 5,
                borderBottomWidth: isSelected ? 2 : 0,
                borderColor: isSelected ? Colors.iconSelectedColor : 'transparent',
                width: itemWidth,
                height: layoutConstants.itemHeight,
            }}
                  onPress={() => {
                      General.logWarn('LandingView', `RAW TOUCH EVENT: ${menuMessageKey} `);
                      wrappedPressHandler();
                  }}
                  disabled={false}
                  activeOpacity={0.6}
            >
                <View style={{height: layoutConstants.iconSize,
                    width: layoutConstants.iconSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: layoutConstants.iconMarginBottom,
                }}>
                    {icon}
                </View>
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
            </TouchableOpacity>
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
        const renderStartTime = new Date();
        General.logDebug("LandingView", `render started - state: home:${this.state.home}, search:${this.state.search}, register:${this.state.register}, menu:${this.state.menu}, syncRequired:${this.state.syncRequired}`);

        const {previouslySelectedSubjectTypeUUID, register, search, menu, home, dashboard, secondaryDashboard, secondaryDashboardSelected} = this.state;

        const displayRegister = this.context.getService(PrivilegeService).displayRegisterButton();
        const startSync = _.isNil(this.props.menuProps) ? false : this.props.menuProps.startSync;
        General.logDebug('LandingView', `render - displayRegister: ${displayRegister}, startSync: ${startSync}, syncRequired: ${this.state.syncRequired}`);
        const subjectTypes = this.context.getService(EntityService).findAll(SubjectType.schema.name);
        const previouslySelectedSubjectType = LocalCacheService.getPreviouslySelectedSubjectType(subjectTypes, previouslySelectedSubjectTypeUUID);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : previouslySelectedSubjectType.registerIcon();
        const renderDot = this.getService(NewsService).isUnreadMoreThanZero();
        const hasRegisterHandler = previouslySelectedSubjectType && (() => this.dispatchAction(Actions.ON_REGISTER_CLICK));
        const registerMenuItem = displayRegister ? [
            this.Icon(registerIcon, LandingView.barIconStyle, register),
            this.I18n.t("register"),
            hasRegisterHandler,
            register
        ] : [];
        General.logDebug('LandingView', `render - register setup: hasRegisterHandler: ${!!hasRegisterHandler}, previouslySelectedSubjectType: ${previouslySelectedSubjectType?.name}`);
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

        General.logDebug('LandingView', `render setup completed, rendering UI elements, took ${new Date() - renderStartTime} ms`);
        return (
            <CHSContainer>
                {home && (function() {
                    General.logDebug('LandingView', `render - Rendering dashboard with startSync: ${startSync}`);
                    return this.renderDashboard(startSync);
                }.bind(this)())}
                {search && (function() {
                    General.logDebug('LandingView', 'render - Rendering IndividualSearchView');
                    return <IndividualSearchView
                        onIndividualSelection={(source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)}
                        buttonElevated={true}
                        hideBackButton={true}/>;
                }.bind(this)())}
                {register && (function() {
                    General.logDebug('LandingView', 'render - Rendering RegisterView');
                    return <RegisterView hideBackButton={true}/>;
                }.bind(this)())}
                {menu && (function() {
                    General.logDebug('LandingView', 'render - Rendering MenuView');
                    return <MenuView menuIcon={(name, style) => this.Icon(name, style)}/>;
                }.bind(this)())}
                {secondaryDashboardSelected && (function() {
                    General.logDebug('LandingView', `render - Rendering secondary CustomDashboardView with startSync: ${startSync}`);
                    return <CustomDashboardView
                        startSync={startSync && this.state.syncRequired}
                        icon={(name, style) => this.Icon(name, style)}
                        title={'home'}
                        hideBackButton={true}
                        renderSync={true}
                        customDashboardType={CustomDashboardType.Secondary}
                        onSearch={() => this.dispatchAction(Actions.ON_SEARCH_CLICK)}
                    />;
                }.bind(this)())}

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