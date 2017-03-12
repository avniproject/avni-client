import {expect, assert} from 'chai';
import _ from "lodash";
import {ProgramEnrolmentActions} from "../../js/action/prorgam/ProgramEnrolmentActions";
import TestContext from "../views/testframework/TestContext";
import ProgramEnrolment from '../../js/models/ProgramEnrolment';
import Individual from '../../js/models/Individual';

describe('ProgramEnrolmentActionsTest', () => {
    it('next without filling enrolmentDateTime', () => {
        const enrolment = ProgramEnrolment.createSafeInstance();
        const serviceData = {};
        serviceData[enrolment.uuid] = enrolment;
        const context = new TestContext(serviceData);

        var state = ProgramEnrolmentActions.getInitialState(context);
        enrolment.individual = Individual.createSafeInstance();
        state = ProgramEnrolmentActions.onLoad(state, {enrolment: enrolment}, context);
        state = ProgramEnrolmentActions.onNext(state, {
            movedNext: () => {
                assert().fail();
            },
            validationFailed: () => {}
        }, context);
    });
});