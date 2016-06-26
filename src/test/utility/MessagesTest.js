import {expect} from 'chai';
import {Messages} from "../../js/utility/Messages";
import ConceptData from "../../js/service/ConceptData";

describe('Messages', () => {
    it('addTerminologyMessages', () => {
        var messages = new Messages();
        messages.addTerminologyMessages(ConceptData);
        expect(messages.getI18n().translations.en["Multiple Choice Question 1"]).is.not.undefined;
    });
});