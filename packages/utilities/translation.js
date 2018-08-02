const _ = require('lodash');
const languages = ['en', 'mr_IN', 'gu_IN', 'hi_IN'];
let coreLabelKeys = [];

let guCoreKeys = Object.keys(require('../openchs-android/config/messages.gu_IN'));
let hiCoreKeys = Object.keys(require('../openchs-android/config/messages.hi_IN'));
let mrCoreKeys = Object.keys(require('../openchs-android/config/messages.mr_IN'));

coreLabelKeys = coreLabelKeys.concat(Object.keys(require('../openchs-android/config/messages.en')));
coreLabelKeys = coreLabelKeys.concat(guCoreKeys);
coreLabelKeys = coreLabelKeys.concat(hiCoreKeys);
coreLabelKeys = coreLabelKeys.concat(mrCoreKeys);

const deDupedLabelKeys = _.uniq(coreLabelKeys);
console.log(`Messages key present as core label key, but not in Gujarati.\n${_.difference(deDupedLabelKeys, guCoreKeys)}\n\n`);
console.log(`Messages key present as core label key, but not in Hindi.\n${_.difference(deDupedLabelKeys, hiCoreKeys)}\n\n`);
console.log(`Messages key present as core label key, but not in Marathi.\n${_.difference(deDupedLabelKeys, mrCoreKeys)}\n\n`);

let candidates = require('./t9n-candidates.json');
let alreadyTranslated = require('../openchs-health-modules/health_modules/customMessages.json');
let alreadyTranslatedKeys = Object.keys(alreadyTranslated.hi_IN);
let candidateNames = candidates.map(function (candidate) {
    return candidate.name;
});
candidateNames = _.difference(candidateNames, alreadyTranslatedKeys);
candidateNames = _.difference(candidateNames, hiCoreKeys);
console.log(`Data based label keys, not translated in Hindi: ${candidateNames.length}\n`);
candidateNames.forEach(function (item) {
    console.log(item);
});