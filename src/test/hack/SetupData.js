import {expect} from 'chai';
import SetupData from "../../js/hack/SetupData";

describe('SetupData', () => {
    it('randomUUID', () => {
        var randomUUID1 = SetupData.randomUUID();
        var randomUUID2 = SetupData.randomUUID();
        expect(randomUUID1).is.not.equal(randomUUID2);
    });
});