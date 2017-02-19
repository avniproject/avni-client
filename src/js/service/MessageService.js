import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import I18n from 'react-native-i18n';
import Messages_en from '../../config/messages.en.json';
import SettingsService from '../service/SettingsService';
import Messages_hi_IN from '../../config/messages.hi_IN.json';
import Messages_mr_IN from '../../config/messages.mr_IN.json';
import ConfigFileService from "./ConfigFileService";

@Service("messageService")
class MessageService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.I18n = I18n;
        this.I18n.fallbacks = true;
        this.I18n.translations = {
            en: Messages_en,
            mr_IN: Messages_mr_IN,
            hi_IN: Messages_hi_IN
        };
        this.I18n.inDefaultLocale = (key)=>_.findKey(this.I18n.translations[this.I18n.locale], (t)=>t === key);
    }

    init() {
        this.setLocale(this.getService(SettingsService).getLocale());
        const configFileService = this.getService(ConfigFileService);
        const customMessages = configFileService.getCustomMessages();
        _.forOwn(customMessages, (translations, locale) => {
            _.forOwn(translations, (value, key) => {
                this.addTranslation(locale, key, value);
            });
        });

    }

    addTranslation(locale, key, value) {
        this.I18n.translations[locale][key] = value;
    }

    setLocale(locale) {
        this.I18n.locale = locale;
    }

    getI18n() {
        return this.I18n;
    }
}

export default MessageService;