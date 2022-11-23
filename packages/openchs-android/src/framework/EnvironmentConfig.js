import Config from "./Config";

class EnvironmentConfig {
    static isDevMode() {
        return Config.ENV === 'dev' || this.isDevModeWithExternalServer();
    }

    static isDevModeWithExternalServer() {
        return Config.ENV === 'ext-dev';
    }
}

export default EnvironmentConfig;
