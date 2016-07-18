let instance = null;
import RuntimeMode from './RuntimeMode';

export class Messages {
    constructor() {
        if (!instance) {
            instance = this;
            //hack - don't know how else to get around this. removing it causes unexpected token because of some es6 compilation issue.
            if (RuntimeMode.runningTest()) {
                this.I18n = {
                    t: function(){}
                };
            } else {
                this.I18n = require('react-native-i18n');
            }

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

        return instance;
    }

    addTerminologyMessages(conceptData) {
        conceptData.concepts.forEach((concept) => {
            concept.conceptNames.forEach((conceptName) => {
                var translationInALocale = this.I18n.translations[conceptName.locale];
                if (translationInALocale === undefined) {
                    this.I18n.translations[conceptName.locale] = {};
                }
                this.I18n.translations[conceptName.locale][concept.name] = conceptName.name;
            });
        });
    }

    getI18n() {
        return this.I18n;
    }
}

export default new Messages().getI18n();