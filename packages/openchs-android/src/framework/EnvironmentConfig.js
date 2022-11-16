import _ from "lodash";
import Config from "./Config";

class EnvironmentConfig {
    static isDevMode() {
        return Config.ENV === 'dev' || Config.ENV === 'ext-dev';
    }
}

export default EnvironmentConfig;
