import Config from "./Config";
import _ from "lodash";

class AppConfig {
    static inNonDevMode() {
        return Config.ENV !== 'dev' && !Config.ENV.endsWith('-dev');
    }

    static get autoSyncDisabled() {
        const disableAutoSyncValue = Config["DISABLE_AUTO_SYNC"];
        return !_.isNil(disableAutoSyncValue) && disableAutoSyncValue;
    }
}

export default AppConfig;
