const _ = require('lodash');
const languages = ['en', 'mr_IN', 'gu_IN', 'hi_IN'];
const candidateLanguage = 'hi_IN';
let allCoreLabelKeys = [];
let translatedCoreKeys = {};

translatedCoreKeys['gu_IN'] = Object.keys(require('../openchs-android/config/messages.gu_IN'));
translatedCoreKeys['hi_IN'] = Object.keys(require('../openchs-android/config/messages.hi_IN'));
translatedCoreKeys['mr_IN'] = Object.keys(require('../openchs-android/config/messages.mr_IN'));
let coreEnglishTranslations = require('../openchs-android/config/messages.en');
translatedCoreKeys['en'] = Object.keys(coreEnglishTranslations);

languages.forEach(language => {
    allCoreLabelKeys = allCoreLabelKeys.concat(translatedCoreKeys[language])
});
allCoreLabelKeys = _.uniq(allCoreLabelKeys);

let candidateKeys = require('./t9n-candidates.json').map(function (candidate) {
    return candidate.name;
});
let customMessages = require('../openchs-health-modules/health_modules/customMessages.json');

let untranslatedCoreKeys = _.difference(allCoreLabelKeys, translatedCoreKeys[candidateLanguage]);
console.log(`Number of core keys not translated: ${untranslatedCoreKeys.length}\n`);
untranslatedCoreKeys.forEach(function (item) {
    console.log(item);
});
console.log(`------------ CORRESPONDING ENGLISH ITEMS ---------------------`);
untranslatedCoreKeys.forEach(function (item) {
    console.log(coreEnglishTranslations[item]);
});
console.log(`------------------------------------------------------------------------------------------------`);

let untranslatedCustomKeys = _.difference(candidateKeys, Object.keys(customMessages[candidateLanguage]));
untranslatedCustomKeys = _.difference(untranslatedCustomKeys, translatedCoreKeys[candidateLanguage]);
console.log(`Number of custom keys not translated: ${untranslatedCustomKeys.length}\n`);
untranslatedCustomKeys.forEach(function (item) {
    console.log(item);
});
console.log(`------------------------------------------------------------------------------------------------`);

let unnecessarilyTranslatedKeys = _.difference(customMessages[candidateLanguage], candidateKeys);
console.log(`Number of keys not translated but not present: ${unnecessarilyTranslatedKeys.length}\n`);
unnecessarilyTranslatedKeys.forEach(function (item) {
    console.log(item);
});