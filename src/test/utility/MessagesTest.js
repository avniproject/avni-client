import {expect} from 'chai';
import {Messages} from "../../js/utility/Messages";

describe('Messages', () => {
    it('addTerminologyMessages', () => {
        var messages = new Messages();
        messages.addTerminologyMessages(ConceptData);
        expect(messages.getI18n().translations.en["Multiple Choice Question 1"]).is.not.undefined;
    });
});