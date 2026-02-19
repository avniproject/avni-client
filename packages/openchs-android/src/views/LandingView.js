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
import OrganisationConfigService from "../service/OrganisationConfigService";
import UserInfoService from "../service/UserInfoService";
import {CopilotProvider, CopilotStep, walkthroughable, useCopilot} from "react-native-copilot";
import CopilotTooltip from "./common/CopilotTooltip";

const WalkthroughableView = walkthroughable(View);

const CopilotStarter = ({shouldStart, onStop}) => {
    const {start, copilotEvents, totalStepsNumber, visible} = useCopilot();
    const onStopRef = React.useRef(onStop);
    onStopRef.current = onStop;

    General.logDebug('CopilotStarter', `Render - shouldStart: ${shouldStart}, totalStepsNumber: ${totalStepsNumber}, visible: ${visible}`);

    React.useEffect(() => {
        const handler = () => onStopRef.current();
        General.logDebug('CopilotStarter', 'Registering stop event listener');
        copilotEvents.on('stop', handler);
        return () => copilotEvents.off('stop', handler);
    }, [copilotEvents]);

    React.useEffect(() => {
        if (shouldStart && totalStepsNumber > 0) {
            start().catch((err) => {
                General.logDebug('CopilotStarter', `start() failed: ${err}`);
            });
        }
    }, [shouldStart, totalStepsNumber]);

    return null;
};

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
        this._guideCheckDone = false;
        this._wasSyncing = false;
        this.state = {
            ...this.state,
            showRegisterGuide: false,
        };
    }

    viewName() {
        return "LandingView";
    }

    componentDidUpdate(prevProps, prevState) {
        this._tryShowRegisterGuide();
    }

    _isSyncModalVisible() {
        const syncState = this.getContextState(Reducers.reducerKeys.syncComponentAction);
        return syncState && syncState.syncing;
    }

    _tryShowRegisterGuide() {
        if (this._guideCheckDone || this.state.showRegisterGuide) return;
        if (this._isSyncModalVisible()) return;

        const orgConfigService = this.context.getService(OrganisationConfigService);
        const settings = orgConfigService.getSettings();
        if (_.isEmpty(settings)) return;

        this._guideCheckDone = true;
        if (!orgConfigService.isGuideUserToRegisterButtonOn()) return;

        LocalCacheService.hasRegisterButtonGuideBeenShown().then(alreadyShown => {
            if (!alreadyShown) {
                setTimeout(() => {
                    this.setState({showRegisterGuide: true});
                }, 300);
            }
        });
    }

    refreshState() {
        // Custom refresh: compare only Redux-managed keys to avoid unnecessary re-renders.
        // super.refreshState() always triggers setState because this.state has 'showRegisterGuide'
        // (local-only key) that the Redux landingView slice doesn't have, making objectsShallowEquals
        // always return false.
        const nextState = this.getContextState(this.topLevelStateVariable);
        if (!General.objectsShallowEquals(nextState, _.omit(this.state, ['showRegisterGuide']))) {
            this.setState({...nextState, showRegisterGuide: this.state.showRegisterGuide});
        }

        const isSyncing = this._isSyncModalVisible();
        if (this._wasSyncing && !isSyncing) {
            this._guideCheckDone = false;
        }
        this._wasSyncing = isSyncing;
        this._tryShowRegisterGuide();
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

    bottomBarItemStyle(isSelected, itemWidth) {
        const { layoutConstants } = LandingView;
        return {
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            paddingVertical: 5,
            borderBottomWidth: isSelected ? 2 : 0,
            borderColor: isSelected ? Colors.iconSelectedColor : 'transparent',
            width: itemWidth,
            height: layoutConstants.itemHeight,
        };
    }

    bottomBarItemContent(icon, menuMessageKey, isSelected, itemWidth) {
        const { layoutConstants } = LandingView;
        return (
            <>
                <View style={{
                    height: layoutConstants.iconSize,
                    width: layoutConstants.iconSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: layoutConstants.iconMarginBottom,
                }}>
                    {icon}
                </View>
                <View style={{
                    width: itemWidth * layoutConstants.textWidthRatio,
                    height: layoutConstants.textContainerHeight,
                    justifyContent: 'flex-start'
                }}>
                    <Text style={{
                        fontSize: Styles.smallerTextSize - 1,
                        paddingTop: 2,
                        fontStyle: 'normal',
                        color: isSelected ? Colors.iconSelectedColor : Colors.bottomBarIconColor,
                        textAlign: 'center',
                        lineHeight: 12,
                    }}>
                        {menuMessageKey}
                    </Text>
                </View>
            </>
        );
    }

    wrappedPressHandler(pressHandler, menuMessageKey) {
        return () => {
            const buttonPressTime = new Date();
            General.logWarn('LandingView', `BUTTON TOUCH DETECTED: ${menuMessageKey} at ${buttonPressTime.toISOString()}`);
            General.logDebug('LandingView', `Button pressed: ${menuMessageKey}`);
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
    }

    renderBottomBarItem(icon, menuMessageKey, pressHandler, isSelected, idx, itemWidth) {
        return _.isNil(menuMessageKey) ? null : (
            <TouchableOpacity key={idx}
                style={this.bottomBarItemStyle(isSelected, itemWidth)}
                onPress={this.wrappedPressHandler(pressHandler, menuMessageKey)}
                activeOpacity={0.6}
            >
                {this.bottomBarItemContent(icon, menuMessageKey, isSelected, itemWidth)}
            </TouchableOpacity>
        );
    }

    renderWalkthroughBBItem(icon, menuMessageKey, pressHandler, isSelected, idx, itemWidth, guideMessage) {
        const { layoutConstants } = LandingView;
        return _.isNil(menuMessageKey) ? null : (
            <TouchableOpacity key={idx}
                style={this.bottomBarItemStyle(isSelected, itemWidth)}
                onPress={this.wrappedPressHandler(pressHandler, menuMessageKey)}
                activeOpacity={0.6}
            >
                <CopilotStep text={guideMessage} order={1} name="register-button">
                    <WalkthroughableView style={{
                        height: layoutConstants.iconSize,
                        width: layoutConstants.iconSize,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: layoutConstants.iconMarginBottom,
                    }}>
                        {icon}
                    </WalkthroughableView>
                </CopilotStep>
                <View style={{
                    width: itemWidth * layoutConstants.textWidthRatio,
                    height: layoutConstants.textContainerHeight,
                    justifyContent: 'flex-start'
                }}>
                    <Text style={{
                        fontSize: Styles.smallerTextSize - 1,
                        paddingTop: 2,
                        fontStyle: 'normal',
                        color: isSelected ? Colors.iconSelectedColor : Colors.bottomBarIconColor,
                        textAlign: 'center',
                        lineHeight: 12,
                    }}>
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

        const {previouslySelectedSubjectTypeUUID, register, search, menu, home, dashboard, secondaryDashboard, secondaryDashboardSelected} = this.state;

        const displayRegister = this.context.getService(PrivilegeService).displayRegisterButton();
        const startSync = _.isNil(this.props.menuProps) ? false : this.props.menuProps.startSync;
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
        const registerButtonIndex = bottomBarIcons.length;
        bottomBarIcons.push(registerMenuItem);
        bottomBarIcons.push(moreMenu);

        const screenWidth = Dimensions.get('window').width;
        const itemWidth = Math.max(screenWidth / bottomBarIcons.length, LandingView.layoutConstants.minItemWidth);
        const showGuide = this.state.showRegisterGuide && displayRegister;
        const userName = this.context.getService(UserInfoService).getUserInfo().getDisplayUsername();
        const guideMessage = this.I18n.t("registerButtonGuideMessage", {userName});
        General.logDebug('LandingView', `render - showGuide: ${showGuide}, showRegisterGuide: ${this.state.showRegisterGuide}, displayRegister: ${displayRegister}, registerButtonIndex: ${registerButtonIndex}, bottomBarCount: ${bottomBarIcons.length}, secondaryDashboard: ${!_.isNil(secondaryDashboard)}`);
        const bottomBarContent = (
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
                {bottomBarIcons.map(([icon, display, cb, isSelected], idx) =>
                    showGuide && idx === registerButtonIndex
                        ? this.renderWalkthroughBBItem(icon, display, cb, isSelected, idx, itemWidth, guideMessage)
                        : this.renderBottomBarItem(icon, display, cb, isSelected, idx, itemWidth)
                )}
            </View>
        );

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

                {showGuide ? (
                    <CopilotProvider
                        overlay="svg"
                        animated={false}
                        backdropColor="rgba(0,0,0,0.57)"
                        tooltipComponent={CopilotTooltip}
                        svgMaskPath={({size, position, canvasSize}) => {
                            const cx = position.x._value + size.x._value / 2;
                            const cy = position.y._value + size.y._value / 2 + 16;
                            const rx = 42;
                            const ry = 42;
                            return `M0,0H${canvasSize.x}V${canvasSize.y}H0V0Z M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 -${rx * 2},0`;
                        }}
                        stopOnOutsideClick={false}
                        arrowColor={Colors.cardBackgroundColor}
                        stepNumberComponent={() => null}
                        tooltipStyle={{borderRadius: 10, paddingHorizontal: 0, paddingTop: 0}}
                        androidStatusBarVisible={true}
                        verticalOffset={0}
                    >
                        {bottomBarContent}
                        <CopilotStarter
                            shouldStart={showGuide}
                            onStop={() => {
                                this.setState({showRegisterGuide: false});
                                LocalCacheService.markRegisterButtonGuideAsShown();
                            }}
                        />
                    </CopilotProvider>
                ) : bottomBarContent}
            </CHSContainer>
        );
    }
}

export default LandingView;
