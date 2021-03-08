import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import {View} from "react-native";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import BeneficiaryModePinService from "../service/BeneficiaryModePinService";
import Spike from './Spike';

@Path('/rootView')
@PathRoot
class RootView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    /**
     * Login page will be shown on startup only if
     * 1. User has never logged in to the app
     * 2. User is able to access the CHS server
     */
    CWM() {
        const authService = this.context.getService(AuthService);
        const beneficiaryModePinService = this.context.getService(BeneficiaryModePinService);
        if (beneficiaryModePinService.inBeneficiaryMode()) {
            CHSNavigator.navigateToBeneficiaryIdentificationPage(this);
            return;
        }
        authService.userExists().then(
            (userExists) => userExists ? CHSNavigator.navigateToLandingView(this, true) : CHSNavigator.navigateToLoginView(this, false),
            CHSNavigator.navigateToLandingView(this, true));
    }

    render() {
        return <Spike/>;
    }
}

export default RootView;