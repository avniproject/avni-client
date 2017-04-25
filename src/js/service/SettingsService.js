import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import InitialSettings from '../../config/initialSettings.json';
import MessageService from './MessageService';
import General from "../utility/General";

@Service("settingsService")
class SettingsService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        const dbInScope = this.db;
        if (this.getSettings() === undefined) {
            this.db.write(() => dbInScope.create('Settings', InitialSettings));
        }
    }

    init() {
        General.setCurrentLogLevel(this.getSettings().logLevel);
    }

    getSettings() {
        const settings = this.db.objects('Settings');
        if (settings === undefined || settings.length === 0) return undefined;
        return settings[0];
    }

    getServerURL() {
        return this.getSettings().serverURL;
    }

    getCatchment() {
        return this.getSettings().catchment;
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

    saveCatchment(catchment) {
        const self = this;
        this.db.write(() => {
            self.getSettings().catchment = catchment;
        });
    }

    saveLogLevel(logLevel) {
        console.log(`Setting logLevel: ${logLevel}`);
        const self = this;
        this.db.write(() => {
            self.getSettings().logLevel = logLevel;
        });
    }

    getLocale() {
        return this.getSettings().locale.selectedLocale;
    }
}

export default SettingsService;