import {expect, assert} from "chai";
import {ProgramEnrolmentActions} from "../../src/action/program/ProgramEnrolmentActions";
import ProgramEnrolmentState from "../../src/state/ProgramEnrolmentState";
import TestContext from "./views/testframework/TestContext";
import {ProgramEnrolment, Individual} from 'avni-models';

describe('ProgramEnrolmentActionsTest', () => {
    it('next without filling enrolmentDateTime', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();
        const serviceData = {};
        serviceData[enrolment.uuid] = enrolment;
        const context = new TestContext(serviceData);

        var state = ProgramEnrolmentActions.getInitialState(context);
        enrolment.enrolmentDateTime = null;
        enrolment.individual = Individual.createEmptyInstance();
        state = ProgramEnrolmentActions.onLoad(state, {enrolment: enrolment, usage: ProgramEnrolmentState.UsageKeys.Enrol}, context);
        state = ProgramEnrolmentActions.onNext(state, {
            movedNext: () => {
                assert().fail();
            },
            validationFailed: () => {}
        }, context);
    });
});