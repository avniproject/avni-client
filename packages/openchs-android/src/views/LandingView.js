import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
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
import CHSContent from "./common/CHSContent";
import AppHeader from "./common/AppHeader";
import Styles from "./primitives/Styles";
import Separator from "./primitives/Separator";
import TypedTransition from "../framework/routing/TypedTransition";
import SettingsView from "./settings/SettingsView";


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


    render() {
        General.logDebug("LandingView", "render");
        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('home')} hideBackButton={true} icon={'settings'} iconFunc={()=> TypedTransition.from(this).to(SettingsView)}/>
                    <IndividualSearchView
                        onIndividualSelection={(source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)}
                        menuProps={this.props.menuProps}/>
            </CHSContainer>
        );
    }
}

export default LandingView;
