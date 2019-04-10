import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import InitialSettings from '../../config/initialSettings.json';
import AvailableLocales from '../../config/AvailableLocales.json';
import General from "../utility/General";
import {ModelGeneral, Settings, LocaleMapping} from 'openchs-models';
import Config from 'react-native-config';
import _ from 'lodash';

@Service("settingsService")
class SettingsService extends BaseService {
    static IncrementalEncounterDisplayCount = 4;

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
            if (_.isNil(settings) || Config.ENV === 'dev') {
                settings = new Settings();
                settings.uuid = Settings.UUID;
                settings.password = "";
                settings.logLevel = InitialSettings.logLevel;
                settings.pageSize = InitialSettings.pageSize;
                settings.serverURL = Config.SERVER_URL;
                settings.poolId = "";
                settings.clientId = Config.CLIENT_ID || "";
                dbInScope.create('Settings', settings, true);
            }

            if (Config.ENV === 'dev') {
                settings.logLevel = General.LogLevel.Debug;
                settings.pageSize = InitialSettings.dev.pageSize;
                settings.devSkipValidation = InitialSettings.dev.skipValidation;
            }

            if (_.isNil(settings.locale)) {
                settings.locale = this.findByKey('locale', InitialSettings.locale, LocaleMapping.schema.name);
                dbInScope.create('Settings', settings, true);
            }
        });
        let level = this.getSettings().logLevel;
        General.setCurrentLogLevel(level);
        ModelGeneral.setCurrentLogLevel(level);
    }

    getSettings() {
        const settings = this.db.objects('Settings');
        if (settings === undefined || settings.length === 0) return undefined;
        return settings[0];
    }

    saveOrUpdate(entity) {
        const output = super.saveOrUpdate(entity, Settings.schema.name);
        let level = this.getSettings().logLevel;
        General.setCurrentLogLevel(level);
        ModelGeneral.setCurrentLogLevel(level);
        return output;
    }
}

export default SettingsService;