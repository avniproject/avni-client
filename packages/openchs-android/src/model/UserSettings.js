import _ from "lodash";

class UserSettings {
    datePickerMode;

    constructor(settings) {
        this.settings = settings;
    }

    get datePickerMode() {
        return _.isNil(this.settings.datePickerMode) ? 'calendar' : this.settings.datePickerMode;
    }
}

export default UserSettings;
