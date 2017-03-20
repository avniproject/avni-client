import {expect} from "chai";

class WizardNextActionStub {
    static forValidationFailed() {
        return new WizardNextActionStub(true, false, false);
    }

    static forCompleted() {
        return new WizardNextActionStub(false, true, false);
    }

    static forMovedNext() {
        return new WizardNextActionStub(false, false, true);
    }

    constructor(validationFailedShouldBeCalled, completedShouldBeCalled, movedNextShouldBeCalled) {
        this.validationFailedShouldBeCalled = validationFailedShouldBeCalled;
        this.completedShouldBeCalled = completedShouldBeCalled;
        this.movedNextShouldBeCalled = movedNextShouldBeCalled;
        this._validationFailed = this._completed = this._movedNext = false;
    }

    validationFailed() {
        this._validationFailed = true;
    }

    completed() {
        this._completed = true;
    }

    movedNext() {
        this._movedNext = true;
    }

    assert() {
        expect(this._validationFailed).is.equal(this.validationFailedShouldBeCalled);
        expect(this._completed).is.equal(this.completedShouldBeCalled);
        expect(this._movedNext).is.equal(this.movedNextShouldBeCalled);
    }
}

export default WizardNextActionStub;