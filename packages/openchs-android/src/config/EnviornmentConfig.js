class EnvironmentConfig {
    initConfig() {
        if (!this.config)
            this.config = require('react-native-config').default;
    }

    _isPropertyTrue(propertyName) {
        this.initConfig();
        return this.config[propertyName] === "true";
    }

    _getPropertyValue(propertyName) {
        this.initConfig();
        return this.config[propertyName];
    }

    get shouldTrackLocation() {
        return this._isPropertyTrue("TRACK_LOCATION");
    }
}

export default new EnvironmentConfig();
