import _ from "lodash";

class UserSettings {
    datePickerMode;

    constructor(settings) {
        this.settings = settings;
    }

    get datePickerMode() {
        return _.isNil(this.settings.datePickerMode) ? 'calendar' : this.settings.datePickerMode;
    }

    get disableAutoSync() {
        return _.isNil(this.settings.disableAutoSync) ? false : this.settings.disableAutoSync;
    }

    get autoRefreshDisabled() {
        return _.isNil(this.settings.disableAutoRefresh) ? false : this.settings.disableAutoRefresh;
    }

    get autoRefreshEnabled() {
        return !this.autoRefreshDisabled;
    }
}

export default UserSettings;
