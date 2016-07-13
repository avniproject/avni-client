import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import InitialSettings from '../../config/initialSettings.json';
import I18n from "../utility/Messages";

@Service("settingsService")
class SettingsService extends BaseService {
    constructor(db) {
        super(db);
        const dbInScope = this.db;
        if (this.getSettings() === undefined)
            this.db.write(() => dbInScope.create('Settings', InitialSettings));
        I18n.locale = this.getSettings().locale.selectedLocale;
    }

    getSettings() {
        var settings = this.db.objects('Settings');
        if (settings === undefined || settings.length === 0) return undefined;
        return settings[0];
    }

    getServerURL() {
        return this.getSettings().serverURL;
    }

    saveServerURL(serverURL) {
        const self = this;
        this.db.write(() => {
            self.getSettings().serverURL = serverURL;
        });
    }

    saveLocale(locale) {
        const self = this;
        this.db.write(() => {
            self.getSettings().locale.selectedLocale = locale;
            I18n.locale = locale;
        });
    }
}

export default SettingsService;