import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import I18n from 'react-native-i18n';
import Messages_en from '../../config/messages.en.json';
import Messages_hi_IN from '../../config/messages.hi_IN.json';
import Messages_mr_IN from '../../config/messages.mr_IN.json';


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
        console.log(this.I18n.translations);
    }

    init(beans) {
        this.setLocale(beans.get("settingsService").getLocale());
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