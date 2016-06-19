import BaseService from "./BaseService";
import Service from "../framework/Service";
import InitialSettings from '../../config/initialSettings.json';
import I18n from "../utility/Messages";

@Service("settingsService")
class SettingsService extends BaseService {
    constructor(db) {
        super(db);
    }

    getSettings() {
        var settings = this.db.objects('Settings');
        if (settings === undefined || settings.length === 0) return undefined;
        return settings[0];
    }
    
    save(locale) {
        const self = this;
        this.db.write(() => {
            self.getSettings().locale.selectedLocale = locale;
            I18n.locale = locale;
        });
    }
    
    initialise() {
        var settings = this.getSettings();
        const dbInScope = this.db;
        if (settings === undefined)
            this.db.write(() => dbInScope.create('Settings', InitialSettings));
        I18n.locale = this.getSettings().locale.selectedLocale;
        console.log(`Default messages default locale=${I18n.defaultLocale}`);
        console.log(`Current messages locale=${I18n.currentLocale()}`);
    }
}

export default SettingsService;