import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import I18n from 'react-native-i18n';
import {EntityMetaData, OrganisationConfig, PlatformTranslation, Translation} from 'openchs-models';
import UserInfoService from "./UserInfoService";
import Messages_en from '../../config/beforeSyncMessages.en.json';

@Service("messageService")
class MessageService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        const t = I18n.t;
        I18n.t = (param, opts) => t.bind(I18n)(param, {...opts, defaultValue: param});
        this.I18n = I18n;
        //Overriding default separator as default is .
        this.I18n.defaultSeparator = "::::";
        this.I18n.fallbacks = true;
        this.I18n.translations = {'en': Messages_en};
    }

    init() {
        this.setTranslationKeys();
        this.I18n.inDefaultLocale = (key) => _.findKey(this.I18n.translations[this.I18n.locale], (t) => t === key);
        const platformTranslations = this.findAll(PlatformTranslation.schema.name);
        const implTranslations = this.findAll(Translation.schema.name);
        this.setLocale(this.getService(UserInfoService).getUserSettings().locale);
        this.addEnglishNameTranslations();
        //let impl override platform translations
        const allTranslations = [...platformTranslations, ...implTranslations];
        _.forEach(allTranslations, t => this.addTranslationsWithLocale(t.language, t.getTranslations()));
    }

    setTranslationKeys() {
        const orgConfig = this.findOnly(OrganisationConfig.schema.name);
        const OrgLocales = _.isEmpty(orgConfig) ? [] : orgConfig.getSettings().languages;
        this.I18n.translations = {...OrgLocales.reduce((object, key) => ({...object, [key]: {}}), {}), ...this.I18n.translations};
    }

    addEnglishNameTranslations() {
        EntityMetaData.model().forEach((entityMetaData) => {
            if (entityMetaData.nameTranslated) {
                this.getAll(entityMetaData.entityName).forEach((entity) => {
                    this.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue);
                });
            }
        });
    }

    addTranslationsWithLocale(locale, translations) {
        _.forOwn(translations, (value, key) => {
            this.addTranslation(locale, key, value);
        });

    }

    addTranslation(locale, key, value) {
        if (this.I18n.translations[locale]) {
            this.I18n.translations[locale][key] = value;
        }
    }

    setLocale(locale) {
        this.I18n.locale = locale;
    }

    getI18n() {
        return this.I18n;
    }
}

export default MessageService;
