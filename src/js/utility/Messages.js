let instance = null;

class Messages {
    constructor() {
        if (!instance) {
            instance = this;
            //hack - don't know how else to get around this. removing it causes unexpected token because of some es6 compilation issue.
            if (process.env.npm_package_scripts_test !== undefined && process.env.npm_package_scripts_test.includes('react-native-mock')) {
                this.I18n = {};
            } else {
                this.I18n = require('react-native-i18n');
            }

            this.I18n.fallbacks = true;
            this.I18n.translations = {
                en: {
                    questionnaireList: 'Decision Support Tools',
                    confirmation: 'Confirmation'
                },
                mr_IN: {
                    questionnaireList: 'Decision Support Tools(MR)'
                }
            }
        }

        return instance;
    }

    getI18n() {
        return this.I18n;
    }
}

export default new Messages().getI18n();