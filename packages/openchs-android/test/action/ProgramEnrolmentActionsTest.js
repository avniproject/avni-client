import {expect, assert} from "chai";
import {ProgramEnrolmentActions} from "../../src/action/program/ProgramEnrolmentActions";
import ProgramEnrolmentState from "../../src/state/ProgramEnrolmentState";
import TestContext from "./views/testframework/TestContext";
import {Checklist, DraftEnrolment, EntityApprovalStatus, Individual, ProgramEncounter, ProgramEnrolment} from 'avni-models';
import General from "../../src/utility/General";
import TestProgramFactory from "../model/TestProgramFactory";

function enrolmentWithChildren() {
    const individual = Individual.createEmptyInstance();
    const program = TestProgramFactory.create({name: 'Child'});

    const enrolment = ProgramEnrolment.createEmptyInstance();
    enrolment.individual = individual;
    enrolment.program = program;

    const checklist = Checklist.create();
    checklist.uuid = General.randomUUID();
    enrolment.checklists = [checklist];

    const encounter = ProgramEncounter.createEmptyInstance();
    enrolment.encounters = [encounter];

    const approvalStatus = EntityApprovalStatus.create(enrolment.uuid, EntityApprovalStatus.entityType.ProgramEnrolment, null, '', false, program.uuid);
    enrolment.approvalStatuses = [approvalStatus];

    return enrolment;
}

describe('ProgramEnrolmentActionsTest', () => {
    it('next without filling enrolmentDateTime', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();
        const serviceData = {};
        serviceData[enrolment.uuid] = enrolment;
        const context = new TestContext(serviceData);

        let state = ProgramEnrolmentActions.getInitialState(context);
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

    it('resuming a draft keeps the enrolment linked to its existing checklists, encounters and approval statuses', () => {
        const enrolment = enrolmentWithChildren();
        const draft = DraftEnrolment.create(enrolment);

        const serviceData = {draftEnabled: true, draftEnrolment: draft};
        serviceData[enrolment.uuid] = enrolment;
        const context = new TestContext(serviceData);

        let state = ProgramEnrolmentActions.getInitialState(context);
        state = ProgramEnrolmentActions.onLoad(state, {
            enrolment: enrolment,
            usage: ProgramEnrolmentState.UsageKeys.Enrol
        }, context);

        expect(state.isDraft).to.equal(true);
        expect(state.enrolment.uuid).to.equal(enrolment.uuid);
        // Without these links ChecklistService creates a second checklist for the same
        // (checklistDetail, enrolment) pair, which the server rejects with a 409 on sync.
        expect(state.enrolment.checklists).to.have.lengthOf(1);
        expect(state.enrolment.encounters).to.have.lengthOf(1);
        expect(state.enrolment.approvalStatuses).to.have.lengthOf(1);
    });
});
