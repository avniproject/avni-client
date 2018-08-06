const _ = require('lodash');
const languages = ['en', 'mr_IN', 'gu_IN', 'hi_IN'];
let coreLabelKeys = [];

let alreadyTranslatedGuKeys = Object.keys(require('../openchs-android/config/messages.gu_IN'));
let alreadyTranslatedHiKeys = Object.keys(require('../openchs-android/config/messages.hi_IN'));
let alreadyTranslatedMrCoreKeys = Object.keys(require('../openchs-android/config/messages.mr_IN'));

coreLabelKeys = coreLabelKeys.concat(Object.keys(require('../openchs-android/config/messages.en')));
coreLabelKeys = coreLabelKeys.concat(alreadyTranslatedGuKeys);
coreLabelKeys = coreLabelKeys.concat(alreadyTranslatedHiKeys);
coreLabelKeys = coreLabelKeys.concat(alreadyTranslatedMrCoreKeys);

const deDupedLabelKeys = _.uniq(coreLabelKeys);
console.log(`Messages key present as core label key, but not in Gujarati.\n${_.difference(deDupedLabelKeys, alreadyTranslatedGuKeys)}\n\n`);
console.log(`Messages key present as core label key, but not in Hindi.\n${_.difference(deDupedLabelKeys, alreadyTranslatedHiKeys)}\n\n`);
console.log(`Messages key present as core label key, but not in Marathi.\n${_.difference(deDupedLabelKeys, alreadyTranslatedMrCoreKeys)}\n\n`);

let candidates = require('./t9n-candidates.json');
let alreadyTranslatedCustom = require('../openchs-health-modules/health_modules/customMessages.json');
let alreadyTranslatedCustomKeys = Object.keys(alreadyTranslatedCustom.mr_IN);
let candidateNames = candidates.map(function (candidate) {
    return candidate.name;
});
candidateNames = _.difference(candidateNames, alreadyTranslatedCustomKeys);
candidateNames = _.difference(candidateNames, alreadyTranslatedMrCoreKeys);
console.log(`Data based label keys, not translated in Hindi: ${candidateNames.length}\n`);
candidateNames.forEach(function (item) {
    console.log(item);
});