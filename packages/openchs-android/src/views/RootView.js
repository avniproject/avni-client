import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, { PathRoot } from "../framework/routing/Path";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import BeneficiaryModePinService from "../service/BeneficiaryModePinService";
import BackupRestoreRealmService from "../service/BackupRestoreRealmService";
import General from "../utility/General";
import HomeScreenView from "./HomeScreenView";
import ExtensionService from "../service/ExtensionService";
import { getAvniError } from "../service/ServerError";
import MessageService from "../service/MessageService";
import { AlertMessage } from "./common/AlertMessage";
import { BackHandler } from "react-native";
import {logForcedLoginPrompt, NO_USER_REASON} from "../utility/ForcedLoginPrompt";
import {getConnectionInfo} from "../utility/ConnectionInfo";
import SessionEstablished from "../service/SessionEstablished";

@Path('/rootView')
@PathRoot
class RootView extends AbstractComponent {
    static propTypes = {};
    TIME_TO_SHOW_SPLASH_SCREEN = 3000;

    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    async UNSAFE_componentWillMount() {
        await this.showSplashScreen();
        await this.openApp();
    }

    async showSplashScreen() {
        try {
            const homeScreenHtml = await this.getService(ExtensionService).getHomeScreen();
            this.setState({html: homeScreenHtml});
        } catch(e) {
            General.logDebug("RootView", "Cannot show custom home screen. Showing default screen instead");
            General.logDebug("RootView", e);
        }
        if (!__DEV__)
            await General.delay(this.TIME_TO_SHOW_SPLASH_SCREEN);
    }

    async openApp() {
        const authService = await this.context.getService(AuthService);
        if (! await authService.isAuthInitialized()) {
            try {
                await authService.fetchAuthSettingsFromServer();
            } catch (error) {
                return AlertMessage('Error', 'Server under maintenance. Please try again after sometime.\n\nPlease kill the app and relaunch if stuck on logo screen.', BackHandler.exitApp);
            }
        }
        const decisionParameters = await this.nextScreenDecisionParameters();

        if (decisionParameters.beneficiaryModeOn) {
            return CHSNavigator.navigateToBeneficiaryIdentificationPage(this);
        }

        let userExists = false;
        await decisionParameters.userExists().then((x) => userExists = x);
        const databaseSynced = this.isDatabaseSynced();
        if (userExists && databaseSynced) {
            return CHSNavigator.navigateToLandingView(this, true);
        }

        General.logDebug("RootView", `User exists: ${userExists}. Database Synced: ${databaseSynced}`);
        // Only a session the user did not end. Data still being on the device proves nothing —
        // a deliberate sign-out leaves it untouched — so this asks whether a session was
        // established and never deliberately cleared. Not awaited: getConnectionInfo races a
        // 3s timeout, and nothing about the navigation should wait on an analytics field.
        if (!userExists) {
            SessionEstablished.wasEstablished().then((wasEstablished) => {
                if (!wasEstablished) return;
                getConnectionInfo().then((connection) => logForcedLoginPrompt(this.context, {
                    errorCode: NO_USER_REASON,
                    isConnected: connection.isConnected
                }));
            });
        }
        return CHSNavigator.navigateToLoginView(this, false);
    }

    async nextScreenDecisionParameters() {
        const authService = this.context.getService(AuthService).getAuthProviderService();
        return {
            beneficiaryModeOn: this.beneficiaryModeOn(),
            userExists: authService.userExists.bind(authService),
            databaseSynced: this.isDatabaseSynced()
        }
    }

    beneficiaryModeOn() {
        return this.context.getService(BeneficiaryModePinService).inBeneficiaryMode();
    }

    isDatabaseSynced() {
        return this.context.getService(BackupRestoreRealmService).isDatabaseEverSynced();
    }

    render() {
        return (
            <HomeScreenView html={this.state.html}/>
        );
    }
}

export default RootView;
