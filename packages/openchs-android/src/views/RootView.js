import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import {View} from "react-native";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";


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
    componentWillMount() {
        const authService = this.context.getService(AuthService);
        authService.userExists().then(
            (userExists) => userExists ? CHSNavigator.navigateToLandingView(this, true) : CHSNavigator.navigateToLoginView(this),
            CHSNavigator.navigateToLandingView(this, true));
    }

    render() {
        return <View/>;
    }
}

export default RootView;