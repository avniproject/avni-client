import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import BeneficiaryModePinService from "../service/BeneficiaryModePinService";
import BackupRestoreRealmService from "../service/BackupRestoreRealm";
import General from "../utility/General";
import HomeScreenView from "./HomeScreenView";
import ExtensionService from "../service/ExtensionService";


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
        await General.delay(this.TIME_TO_SHOW_SPLASH_SCREEN);
    }

    async openApp() {
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

        return CHSNavigator.navigateToLoginView(this, false);
    }

    async nextScreenDecisionParameters() {
        const authService = this.context.getService(AuthService);
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
