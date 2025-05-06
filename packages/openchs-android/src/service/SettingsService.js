import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import InitialSettings from '../../config/initialSettings.json';
import AvailableLocales from '../../config/AvailableLocales.json';
import General from "../utility/General";
import {ModelGeneral, Settings, LocaleMapping, OrganisationConfig} from 'openchs-models';
import Config from '../framework/Config';
import _ from 'lodash';
import EnvironmentConfig from "../framework/EnvironmentConfig";
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';

@Service("settingsService")
class SettingsService extends BaseService {
    static IncrementalEncounterDisplayCount = 3;

    constructor(db, beanStore) {
        super(db, beanStore);
    }

    async init() {
        let url = Config.allowServerURLConfig ? await AsyncStorage.getItem('serverUrl') : Config.SERVER_URL;
        const dbInScope = this.db;
        General.logDebug("SettingsService", `Config.ENV: ${Config.ENV}`);
        this.db.write(() => {
            let settings = this.getSettings();
            General.logDebug("SettingsService", `Settings is initialised? ${!_.isNil(settings)}`);
            if (_.isNil(settings)) {
                settings = new Settings();
                settings.uuid = Settings.UUID;
                settings.password = "";
                settings.logLevel = InitialSettings.logLevel;
                settings.pageSize = InitialSettings.pageSize;
                settings.serverURL = url;
                settings.poolId = "";
                settings.clientId = Config.CLIENT_ID || "";
                if (Config.allowServerURLConfig){
                    RNRestart.Restart();
                }
            }

            if (EnvironmentConfig.isDevMode()) {
                settings.logLevel = General.LogLevel.Debug;
                settings.pageSize = 5000;
                settings.devSkipValidation = InitialSettings.dev.skipValidation;
            }

            if (_.isNil(settings.locale)) {
                settings.locale = this.findByKey('locale', InitialSettings.locale, LocaleMapping.schema.name);
                dbInScope.create('Settings', settings, true);
            }
            dbInScope.create('Settings', settings, true);
        });
        let level = this.getSettings().logLevel;
        General.logDebug("SettingsService", `Log level: ${level}`);
        General.setCurrentLogLevel(level);
        General.logDebug("SettingsService", "General - Test log debug message");
        ModelGeneral.setCurrentLogLevel(level);
        ModelGeneral.logDebug("SettingsService", "ModelGeneral - Test log debug message");
    }

    getSettings() {
        const settings = this.findAll(Settings.schema.name);
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

    initLanguages() {
        this.clearDataIn([LocaleMapping]);
        const dbInScope = this.db;
        const orgConfig = this.findOnly(OrganisationConfig.schema.name);
        const languages = _.isEmpty(orgConfig) ? ['en'] : orgConfig.getSettings().languages;
        const OrgLocales = AvailableLocales.filter(localeMapping => languages.includes(localeMapping.locale));
        this.db.write(() => {
            OrgLocales.forEach((localeMapping) => {
                dbInScope.create('LocaleMapping', localeMapping, true);
            })
        })
    }
}

export default SettingsService;
