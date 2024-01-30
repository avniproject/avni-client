import Config from "./Config";
import _ from "lodash";

class EnvironmentConfig {
    static inNonDevMode() {
        return !EnvironmentConfig.isDevMode();
    }

    static isDevMode() {
        return Config.ENV === 'dev' || this.isDevModeWithExternalServer();
    }

    static isDevModeWithExternalServer() {
        return Config.ENV === 'ext-dev';
    }

    static get autoSyncDisabled() {
        const disableAutoSyncValue = Config["DISABLE_AUTO_SYNC"];
        return !_.isNil(disableAutoSyncValue) && disableAutoSyncValue;
    }

    static goToLastPageOnNext() {
        return EnvironmentConfig.isDevMode() && Config.goToLastPageOnNext;
    }

    static isProd() {
        return Config.ENV === 'prod';
    }

    static logAnalytics() {
        return EnvironmentConfig.isProd() || Config.debugFirebaseAnalyticsEvents === true
    }

    static disallowedAppRunOnRootDevices() {
        const isAppRunDisallowedOnRootDevices = Config.DISABLE_APP_RUN_ON_ROOTED_DEVICES;
        return !_.isNil(isAppRunDisallowedOnRootDevices) && isAppRunDisallowedOnRootDevices;
    }

    static isProdAndDisallowedOnRootDevices() {
        return EnvironmentConfig.isProd() && EnvironmentConfig.disallowedAppRunOnRootDevices();
    }
}

export default EnvironmentConfig;
