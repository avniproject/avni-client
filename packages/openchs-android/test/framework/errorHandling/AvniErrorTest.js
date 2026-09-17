import {expect} from 'chai';
import AvniError from "../../../src/framework/errorHandling/AvniError";

describe('AvniError', () => {
    const stack = "at Realm ((native)::)";
    const outOfSpace = "Exception in HostFunction: write() failed: No space left on device";

    it('asks the user to clear storage when the device is out of space', () => {
        const avniError = AvniError.createFromUserMessageAndStackTrace(outOfSpace, stack);
        expect(avniError.getDisplayMessage()).to.equal("No space left on your device. Clear some storage to proceed further.");
    });

    it('keeps the original error for reporting', () => {
        const avniError = AvniError.createFromUserMessageAndStackTrace(outOfSpace, stack);
        expect(avniError.reportingText).to.equal(`${outOfSpace}\n${stack}`);
    });

    it('leaves other errors unchanged', () => {
        const message = "Cannot read property 'uuid' of undefined";
        const avniError = AvniError.createFromUserMessageAndStackTrace(message, stack);
        expect(avniError.getDisplayMessage()).to.equal(`${message}\n${stack}`);
    });
});
