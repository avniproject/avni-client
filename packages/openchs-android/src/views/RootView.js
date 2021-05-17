import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import {View} from "react-native";
import AuthService from "../service/AuthService";
import CHSNavigator from "../utility/CHSNavigator";
import BeneficiaryModePinService from "../service/BeneficiaryModePinService";
import BackupRestoreRealmService from "../service/BackupRestoreRealm";
import General from "../utility/General";


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
        const beneficiaryModePinService = this.context.getService(BeneficiaryModePinService);
        if (beneficiaryModePinService.inBeneficiaryMode()) {
            CHSNavigator.navigateToBeneficiaryIdentificationPage(this);
            return;
        }
        const context = this.context;
        authService.userExists().then((userExists) => {
            let backupRestoreRealmService = context.getService(BackupRestoreRealmService);
            let databaseSynced = !backupRestoreRealmService.isDatabaseNotSynced();
            General.logDebug("RootView", databaseSynced);
            if (userExists && databaseSynced)
                CHSNavigator.navigateToLandingView(this, true)
            else {
                CHSNavigator.navigateToLoginView(this, false);
            }
        });
    }

    render() {
        return <View/>;
    }
}

export default RootView;
