import BaseService from "./BaseService";
import Service from "../framework/Service";
import InitialSettings from '../../config/initialSettings.json';

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
    
    save(fn) {
        this.db.write(fn);
    }
    
    initialise() {
        var settings = this.getSettings();
        const dbInScope = this.db;
        if (settings === undefined)
            this.db.write(() => dbInScope.create('Settings', InitialSettings));
    }
}

export default SettingsService;