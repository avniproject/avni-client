import {expect} from 'chai';
import English from '../../config/messages.en.json';
import Marathi from '../../config/messages.mr_IN.json';
import Hindi from '../../config/messages.hi_IN.json';
import Gujarati from '../../config/messages.gu_IN.json';
import _ from 'lodash';

describe('MessagesConfigTest', () => {
    it('Check All Translations', () => {
        var engKeys = _.keys(English);
        var marathiKeys = _.keys(Marathi);
        var hindiKeys = _.keys(Hindi);
        var gujaratiKeys = _.keys(Gujarati);
        var missingInMarathi = _.difference(engKeys, marathiKeys);
        var missingInHindi = _.difference(engKeys, hindiKeys);
        var missingInGujarati = _.difference(engKeys, gujaratiKeys);

        console.log(`Number of keys missing in marathi: ${missingInMarathi.length}`);
        console.log(`Number of keys missing in hindi: ${missingInHindi.length}`);
        console.log(`Number of keys missing in gujarati: ${missingInGujarati.length}`);
    });
});