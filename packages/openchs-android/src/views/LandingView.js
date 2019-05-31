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
import {Text, TouchableOpacity, View} from "react-native";
import EntityService from "../service/EntityService";
import {SubjectType} from "openchs-models";
import _ from "lodash";
import Colors from "./primitives/Colors";
import RegisterView from "./RegisterView";
import SyncComponent from "./SyncComponent";

@Path('/landingView')
class LandingView extends SyncComponent {
    static propTypes = {
        menuProps: PropTypes.object
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.landingView);
        this.state = {
            syncing: false,
            isConnected: true,
            error: false,
            startSync: _.isNil(this.props.menuProps) ? false : this.props.menuProps.startSync,
        }
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


    renderBottomBarIcons(icon, menuMessageKey, pressHandler, isSelected, idx) {
        return (<View key={idx} style={{
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <TouchableOpacity style={{height: 35, width: 35}} onPress={pressHandler}>
                {icon}
            </TouchableOpacity>
            <Text style={{
                fontSize: Styles.smallerTextSize,
                fontStyle: 'normal',
                color: isSelected ? Colors.ActionButtonColor : 'white',
                lineHeight: 10,
                alignSelf: 'center', paddingTop: 4
            }}>{menuMessageKey}</Text>
        </View>);
    }

    static barIconStyle = {color: 'white', opacity: 0.8, alignSelf: 'center', fontSize: 35};

    render() {
        General.logDebug("LandingView", "render");
        const subjectTypes = this.context.getService(EntityService).getAll(SubjectType.schema.name);
        const registerIcon = _.isEmpty(subjectTypes) ? 'plus-box' : subjectTypes[0].registerIcon();
        const registerMenuItem = !this.state.hideRegister ? [this.Icon(registerIcon, LandingView.barIconStyle, this.state.register), this.I18n.t("register"),
            subjectTypes[0] && (() => this.dispatchAction(Actions.ON_REGISTER_CLICK)), this.state.register] : [];
        const bottomBarIcons = [
            [this.Icon("home", LandingView.barIconStyle, this.state.home), this.I18n.t("home"), () => this.dispatchAction(Actions.ON_HOME_CLICK), this.state.home],
            registerMenuItem,
            [this.Icon("view-list", LandingView.barIconStyle, this.state.dashboard), this.I18n.t("Dashboard"), () => this.dispatchAction(Actions.ON_DASHBOARD_CLICK), this.state.dashboard],
            [this.Icon("menu", LandingView.barIconStyle, this.state.menu), this.I18n.t("More"), () => this.dispatchAction(Actions.ON_MENU_CLICK), this.state.menu]
        ];

        return (
            <CHSContainer>
                {this.state.home && <IndividualSearchView
                    onIndividualSelection={(source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)}
                    iconComponent={this.syncIcon} iconFunc={this.sync.bind(this)}/>}
                {this.state.dashboard && <MyDashboardView/>}
                {this.state.register && <RegisterView/>}
                {this.state.menu && <MenuView menuIcon={(name, style) => this.Icon(name, style)}/>}

                {this.renderSyncModal()}
                <View style={{
                    height: 50,
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    backgroundColor: Styles.blackColor,
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    elevation: 3,
                }}>

                    {bottomBarIcons.map(([icon, display, cb, isSelected], idx) => this.renderBottomBarIcons(icon, display, cb, isSelected, idx))}
                </View>
            </CHSContainer>
        );
    }
}

export default LandingView;
