import PropTypes from 'prop-types';
import React from "react";
import Path from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import CHSContainer from "./common/CHSContainer";
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
import {Icon as NBIcon} from "native-base";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import EntypoIcon from "react-native-vector-icons/Entypo";
import PrivilegeService from "../service/PrivilegeService";
import CustomFilterService from "../service/CustomFilterService";
import CustomDashboardView from "./customDashboard/CustomDashboardView";
import CustomDashboardService from "../service/customDashboard/CustomDashboardService";
import NewsService from "../service/news/NewsService";
import {CustomDashboardActionNames} from "../action/customDashboard/CustomDashboardActions";


@Path('/landingView')
class LandingView extends AbstractComponent {
    static propTypes = {
        menuProps: PropTypes.object
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.landingView);
    }

    viewName() {
        return "LandingView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        const authService = this.context.getService(AuthService);
        authService.getUserName().then(username => {
            bugsnag.setUser(username, username, username);
        });

        return super.componentWillMount();
    }

    didFocus() {
        this.refreshCustomDashboardsCounts();
    }

    refreshCustomDashboardsCounts() {
        this.dispatchAction(CustomDashboardActionNames.REMOVE_OLDER_COUNTS);
        setTimeout(() => this.dispatchAction(CustomDashboardActionNames.REFRESH_COUNT), 500);
    }

    renderBottomBarIcons(icon, menuMessageKey, pressHandler, isSelected, idx) {
        return _.isNil(menuMessageKey) ? null :
            (<View key={idx} style={[{
                alignItems: 'center',
                flexDirection: 'column',
            }, isSelected && {borderBottomWidth: 2, borderColor: Colors.iconSelectedColor, marginBottom: 1}]}>
                <TouchableOpacity style={{height: 35, width: 35}} onPress={pressHandler}>
                    {icon}
                </TouchableOpacity>
                <Text style={{
                    fontSize: Styles.smallerTextSize,
                    fontStyle: 'normal',
                    color: isSelected ? Colors.iconSelectedColor : Colors.bottomBarIconColor,
                    lineHeight: 12,
                    alignSelf: 'center', paddingTop: 3
                }}>{menuMessageKey}</Text>
            </View>);
    }

    Icon(iconName, iconStyle, isSelected, renderDot = false) {
        //Arjun: i hate to do this. but MCI does not provide a good video icon and can't provide on decent UI
        //Arjun: TODO someday we need to have one single icon library.
        const style = iconStyle ? (isSelected ? {
            ...iconStyle,
            color: Colors.iconSelectedColor
        } : iconStyle) : MenuView.iconStyle;
        if (_.startsWith(iconName, 'video')) {
            return <NBIcon name={iconName} type='MaterialIcons' style={style}/>
        }
        return renderDot ? this.IconWithDot(iconName, style) : <MCIIcon name={iconName} style={style}/>
    }

    IconWithDot(iconName, iconStyle) {
        return <View style={{flexDirection: 'row', flex: 1}}>
            <MCIIcon name={iconName} style={[iconStyle, {fontSize: 30}]}/>
            <EntypoIcon name={'dot-single'}
                        style={{fontSize: 25, color: Colors.BadgeColor, position: 'absolute', top: -6, right: -6}}/>
        </View>
    }

    static barIconStyle = {color: Colors.bottomBarIconColor, opacity: 0.8, alignSelf: 'center', fontSize: 33};

    renderCustomDashboard(startSync) {
        return <CustomDashboardView
            startSync={startSync && this.state.syncRequired}
            icon={(name, style) => this.Icon(name, style)}
            title={'home'}
            hideBackButton={true}
            renderSync={true}
            onlyPrimary={true}
        />
    }

    renderDefaultDashboard(startSync) {
        return <MyDashboardView
            startSync={startSync && this.state.syncRequired}
            icon={(name, style) => this.Icon(name, style)}/>
    }

    renderDashboard(startSync) {
        const renderCustomDashboard = this.getService(CustomDashboardService).isCustomDashboardMarkedPrimary();
        return renderCustomDashboard ? this.renderCustomDashboard(startSync) : this.renderDefaultDashboard(startSync);
    }

    render() {
        General.logDebug("LandingView", "render");
        const displayRegister = this.context.getService(PrivilegeService).displayRegisterButton();
        const startSync = _.isNil(this.props.menuProps) ? false : this.props.menuProps.startSync;
        const subjectTypes = this.context.getService(EntityService).getAll(SubjectType.schema.name);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : subjectTypes[0].registerIcon();
        const hideSearch = this.context.getService(CustomFilterService).hideSearchButton();
        const renderDot = this.getService(NewsService).isUnreadMoreThanZero();
        const registerMenuItem = displayRegister ? [this.Icon(registerIcon, LandingView.barIconStyle, this.state.register), this.I18n.t("register"),
            subjectTypes[0] && (() => this.dispatchAction(Actions.ON_REGISTER_CLICK)), this.state.register] : [];
        const searchMenuItem = !hideSearch ? [this.Icon("magnify", LandingView.barIconStyle, this.state.search), this.I18n.t("search"),
            () => this.dispatchAction(Actions.ON_SEARCH_CLICK), this.state.search] : [];
        const bottomBarIcons = [
            [this.Icon("home", LandingView.barIconStyle, this.state.home), this.I18n.t("home"), () => this.dispatchAction(Actions.ON_HOME_CLICK), this.state.home],
            registerMenuItem,
            searchMenuItem,
            [this.Icon("menu", LandingView.barIconStyle, this.state.menu, renderDot), this.I18n.t("More"), () => this.dispatchAction(Actions.ON_MENU_CLICK), this.state.menu]
        ];

        return (
            <CHSContainer>
                {this.state.home && this.renderDashboard(startSync) }
                {this.state.search && <IndividualSearchView
                    onIndividualSelection={(source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)}
                    buttonElevated={true}
                    hideBackButton={true}/>}
                {this.state.register && <RegisterView hideBackButton={true}/>}
                {this.state.menu && <MenuView menuIcon={(name, style) => this.Icon(name, style)}/>}
                {this.state.dashboard && <CustomDashboardView hideBackButton={true}/>}

                <View style={{
                    height: 55,
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    backgroundColor: Colors.bottomBarColor,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    elevation: 3,
                    alignItems: 'center',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: Colors.Separator
                }}>

                    {bottomBarIcons.map(([icon, display, cb, isSelected], idx) => this.renderBottomBarIcons(icon, display, cb, isSelected, idx))}
                </View>
            </CHSContainer>
        );
    }
}

export default LandingView;
