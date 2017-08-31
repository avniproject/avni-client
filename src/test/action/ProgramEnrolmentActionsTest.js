import {expect, assert} from "chai";
import {ProgramEnrolmentActions} from "../../js/action/program/ProgramEnrolmentActions";
import ProgramEnrolmentState from "../../js/action/program/ProgramEnrolmentState";
import TestContext from "../views/testframework/TestContext";
import ProgramEnrolment from "../../js/models/ProgramEnrolment";
import Individual from "../../js/models/Individual";

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