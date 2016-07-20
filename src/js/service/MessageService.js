import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import I18n from 'react-native-i18n';


@Service("messageService")
class MessageService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.I18n = I18n;
        this.I18n.fallbacks = true;
        this.I18n.translations = {
            en: {
                questionnaireList: 'Decision Support Tools',
                confirmation: 'Confirmation',
                next: 'Next >>',
                previous: '<< Previous',
                restart: 'Restart',
                saveAndRestart: 'Save & Restart',
                export: 'Export',
                answersConfirmationTitle: 'You answered as follows',
                allQuestionnaireSessionsSummary: "All Questionnaire Sessions",
                session: "Session Details",
                decisionsMadeBySystem: "Decisions made by system",
                viewSavedSessions: "View Data",
                sessionsForPrefix: "Sessions for",
                zeroNumberOfSessions: "There are no saved sessions",
                deleteSessions: "Delete Data",
                deleteConfirmation: "Do you want to delete all saved sessions?",
                numberOfSessions: "There are currently {{count}} sessions.",
                validationError: 'Validation Error',
                numericValueValidation: "Is not a number or is out of range {{range}}",
                emptyValidationMessage: "There is no value specified",
                settings: "Settings",
                close: "Close"
            },
            mr_IN: {
                questionnaireList: '',
                saveAndRestart: 'सेव',
                restart: 'पुनः सुरू',
                viewSavedSessions: "डाटा पाहा",
                deleteSessions: "डाटा डीलीट",
                export: "डाउनलोड",
                sessionsForPrefix: "मागील तपासण्या",
                answersConfirmationTitle: "दिलेले उत्तर",
                decisionsMadeBySystem: "उपचार",
                deleteConfirmation: "तुम्हाला सर्व डाटा डीलीट करावयाचा आहे का?",
                numberOfSessions: "{{count}} तपासण्यांचा डाटा डीलीट होइल.",
                validationError: 'फॉर्म वर चुक आहे ',
                numericValueValidation: "कृपया {{range}} मधील नंबर टाका",
                emptyValidationMessage: "ह्या प्रश्नाचे उत्तर देणे अनिवार्य आहे ",
                settings: "सेटिंग"
            },
            hi_IN: {
                questionnaireList: 'फेसला समर्थन उपकरण',
                confirmation: 'पुष्टीकरण',
                restart: 'पुनः आरंभ करें',
                saveAndRestart: 'बचाएँ एवं पुनः आरम्भ करें',
                export: 'निर्यात',
                answersConfirmationTitle: ''
            }
        }
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