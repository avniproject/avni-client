import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import InitialSettings from '../../config/initialSettings.json';
import AvailableLocales from '../../config/AvailableLocales.json';
import General from "../utility/General";
import Settings from "../models/Settings";
import _ from 'lodash';
import LocaleMapping from '../models/Locale';

@Service("settingsService")
class SettingsService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        const dbInScope = this.db;
        this.db.write(() => {
            AvailableLocales.forEach((localeMapping) => {
                dbInScope.create('LocaleMapping', localeMapping, true);
            });

            var settings = this.getSettings();
            if (_.isNil(settings)) {
                settings = new Settings();
                settings.uuid = Settings.UUID;
                settings.logLevel = InitialSettings.logLevel;
                settings.catchment = InitialSettings.catchment;
                settings.serverURL = InitialSettings.serverURL;
                dbInScope.create('Settings', settings, true);
            }

            if (_.isNil(settings.locale)) {
                settings.locale = this.findByKey('locale', InitialSettings.locale, LocaleMapping.schema.name);
                dbInScope.create('Settings', settings, true);
            }
        });

        General.setCurrentLogLevel(this.getSettings().logLevel);
    }

    getSettings() {
        const settings = this.db.objects('Settings');
        if (settings === undefined || settings.length === 0) return undefined;
        return settings[0];
    }

    saveOrUpdate(entity, schema) {
        const output = super.saveOrUpdate(entity, schema);
        General.setCurrentLogLevel(this.getSettings().logLevel);
        return output;
    }
}

export default SettingsService;