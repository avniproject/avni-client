import _ from "lodash";
import Config from "./Config";

class AppConfig {
    static inNonDevMode() {
        return Config.ENV !== 'dev' && !Config.ENV.endsWith('-dev');
    }
}

export default AppConfig;
