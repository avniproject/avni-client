import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import InitialSettings from '../../config/initialSettings.json';
import MessageService from './MessageService';

@Service("settingsService")
class SettingsService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        const dbInScope = this.db;
        if (this.getSettings() === undefined)
            this.db.write(() => dbInScope.create('Settings', InitialSettings));
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
        const messageService = this.getService(MessageService);
        const self = this;
        this.db.write(() => {
            self.getSettings().locale.selectedLocale = locale;
            messageService.setLocale(locale);
        });
    }

    getLocale() {
        return this.getSettings().locale.selectedLocale;
    }
}

export default SettingsService;