// Auto-share-on-save behavior — reducer-side: confirms RosterActions.onSave and
// DidntHappenActions.onSave produce a pendingAutoShareWorkItem whenever the
// attendance type opts in, on every save (initial OR re-mark).

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceRecord, Session, WorkItem} from "avni-models";
import {RosterActions} from "../../../src/action/attendance/RosterActions";
import {DidntHappenActions} from "../../../src/action/attendance/DidntHappenActions";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

const STUDENT_SUBJECT_TYPE = {uuid: "st-student", group: false};

function makeAttendanceType({autoShareOnSave = false, followUpEncounterType = null} = {}) {
    return {
        uuid: "at-uuid",
        name: "Morning Prayer",
        getFollowUpEncounterTypeUUID: () => followUpEncounterType,
        getAbsenceReasonConceptUUID: () => "rc-uuid",
        getSessionOutcomeReasonConceptUUID: () => "outcome-uuid",
        isAutoShareOnSave: () => autoShareOnSave,
        getShareRule: () => null,
    };
}

function makeGroupSubject() {
    return {uuid: "g-uuid", nameString: "Class 7A", subjectType: {uuid: "st-group", group: true}};
}

function makeRosterContext({sessionService, attendanceRecordService}) {
    const SessionService = require("../../../src/service/SessionService").default;
    const GroupSubjectService = require("../../../src/service/GroupSubjectService").default;
    const UserInfoService = require("../../../src/service/UserInfoService").default;
    const EntityService = require("../../../src/service/EntityService").default;
    const FormMappingService = require("../../../src/service/FormMappingService").default;
    const IndividualService = require("../../../src/service/IndividualService").default;
    const ProgramEnrolmentService = require("../../../src/service/ProgramEnrolmentService").default;
    const AttendanceRecordService = require("../../../src/service/AttendanceRecordService").default;
    const ConceptService = require("../../../src/service/ConceptService").default;
    const EncounterService = require("../../../src/service/EncounterService").default;
    const ProgramEncounterService = require("../../../src/service/program/ProgramEncounterService").default;
    return makeContext([
        [SessionService, sessionService],
        [GroupSubjectService, {getGroupSubjects: () => [{memberSubject: {uuid: "s1", voided: false, subjectType: STUDENT_SUBJECT_TYPE}}]}],
        [UserInfoService, {getUserInfo: () => ({username: "marker.user"})}],
        [EntityService, {findByUUID: jest.fn(() => null)}],
        [FormMappingService, {findProgramUUIDForEncounterType: jest.fn(() => null)}],
        [IndividualService, {findByUUID: jest.fn(uuid => ({uuid, nameString: uuid.toUpperCase(), subjectType: STUDENT_SUBJECT_TYPE}))}],
        [ProgramEnrolmentService, {getEnrolmentBySubjectUuidAndProgramUuid: jest.fn(() => null)}],
        [AttendanceRecordService, attendanceRecordService],
        [ConceptService, {getConceptByUUID: () => ({uuid: "c1", name: "Sick"})}],
        [EncounterService, {findByUUID: jest.fn(() => null)}],
        [ProgramEncounterService, {findByUUID: jest.fn(() => null)}],
    ]);
}

function makeRosterState({autoShareOnSave = false, existingSession = null} = {}) {
    return {
        groupSubject: makeGroupSubject(),
        attendanceType: makeAttendanceType({autoShareOnSave}),
        scheduledDate: "2026-05-21",
        existingSession,
        roster: [
            {subjectUUID: "s1", name: "Aarav", status: AttendanceRecord.status.PRESENT, reasonConceptUUID: null},
        ],
        notes: "",
        absenceReasonAnswers: [],
        followUpEncounterTypeUuid: null,
    };
}

describe("RosterActions.onSave — auto-share work item", () => {
    let sessionService, attendanceRecordService;

    beforeEach(() => {
        sessionService = {saveOrUpdate: jest.fn(() => ({voidedFollowUps: [], skippedFollowUps: []}))};
        attendanceRecordService = {findBySession: jest.fn(() => [])};
    });

    it("does not queue a work item when isAutoShareOnSave() returns false", () => {
        const state = makeRosterState({autoShareOnSave: false});

        const next = RosterActions.onSave(state, {}, makeRosterContext({sessionService, attendanceRecordService}));

        assert.isNull(next.pendingAutoShareWorkItem);
    });

    it("queues SHARE_SESSION with {sessionUUID, format:'text'} when isAutoShareOnSave() is true (initial save)", () => {
        const state = makeRosterState({autoShareOnSave: true});

        const next = RosterActions.onSave(state, {}, makeRosterContext({sessionService, attendanceRecordService}));

        const wi = next.pendingAutoShareWorkItem;
        assert.instanceOf(wi, WorkItem);
        assert.equal(wi.type, WorkItem.type.SHARE_SESSION);
        assert.equal(wi.parameters.format, "text");
        // sessionUUID matches the session that was upserted
        const session = sessionService.saveOrUpdate.mock.calls[0][0].session;
        assert.equal(wi.parameters.sessionUUID, session.uuid);
    });

    it("queues a work item on re-mark too (existingSession present), so edits still trigger share", () => {
        const state = makeRosterState({
            autoShareOnSave: true,
            existingSession: {uuid: "sess-prior", status: Session.status.HELD, notes: "", reasonConceptUUID: null},
        });

        const next = RosterActions.onSave(state, {}, makeRosterContext({sessionService, attendanceRecordService}));

        const wi = next.pendingAutoShareWorkItem;
        assert.instanceOf(wi, WorkItem);
        assert.equal(wi.parameters.sessionUUID, "sess-prior", "re-mark keeps the prior uuid");
    });

    it("tolerates an attendance type missing isAutoShareOnSave() (defensive)", () => {
        const state = makeRosterState();
        state.attendanceType = {...state.attendanceType, isAutoShareOnSave: undefined};

        const next = RosterActions.onSave(state, {}, makeRosterContext({sessionService, attendanceRecordService}));

        assert.isNull(next.pendingAutoShareWorkItem);
    });
});

function makeDidntHappenContext({sessionService, attendanceRecordService, conceptService}) {
    const SessionService = require("../../../src/service/SessionService").default;
    const AttendanceRecordService = require("../../../src/service/AttendanceRecordService").default;
    const ConceptService = require("../../../src/service/ConceptService").default;
    const UserInfoService = require("../../../src/service/UserInfoService").default;
    return makeContext([
        [SessionService, sessionService],
        [AttendanceRecordService, attendanceRecordService],
        [ConceptService, conceptService],
        [UserInfoService, {getUserInfo: () => ({username: "marker.user"})}],
    ]);
}

function makeDidntHappenState({autoShareOnSave = false, existingSession = null} = {}) {
    return {
        groupSubject: makeGroupSubject(),
        attendanceType: makeAttendanceType({autoShareOnSave}),
        scheduledDate: "2026-05-21",
        existingSession,
        reasonConceptUUID: "rc-1",
        notes: "Public holiday",
        reasonAnswers: [],
    };
}

describe("DidntHappenActions.onSave — auto-share work item", () => {
    let sessionService, attendanceRecordService, conceptService;

    beforeEach(() => {
        sessionService = {saveOrUpdate: jest.fn(() => ({voidedFollowUps: [], skippedFollowUps: []}))};
        attendanceRecordService = {findBySession: jest.fn(() => [])};
        conceptService = {getConceptByUUID: jest.fn(() => ({uuid: "rc-1", name: "Holiday"}))};
    });

    it("does not queue a work item when isAutoShareOnSave() returns false", () => {
        const state = makeDidntHappenState({autoShareOnSave: false});

        const next = DidntHappenActions.onSave(state, {}, makeDidntHappenContext({sessionService, attendanceRecordService, conceptService}));

        assert.isNull(next.pendingAutoShareWorkItem);
    });

    it("queues SHARE_SESSION on initial DidntHappen save when auto-share is on", () => {
        const state = makeDidntHappenState({autoShareOnSave: true});

        const next = DidntHappenActions.onSave(state, {}, makeDidntHappenContext({sessionService, attendanceRecordService, conceptService}));

        const wi = next.pendingAutoShareWorkItem;
        assert.instanceOf(wi, WorkItem);
        assert.equal(wi.type, WorkItem.type.SHARE_SESSION);
        assert.equal(wi.parameters.format, "text");
        const session = sessionService.saveOrUpdate.mock.calls[0][0].session;
        assert.equal(wi.parameters.sessionUUID, session.uuid);
    });

    it("queues a work item on re-mark too (flipping a HELD session to DIDNT_HAPPEN)", () => {
        const state = makeDidntHappenState({
            autoShareOnSave: true,
            existingSession: {uuid: "sess-prior", status: Session.status.HELD, notes: "", reasonConceptUUID: null},
        });

        const next = DidntHappenActions.onSave(state, {}, makeDidntHappenContext({sessionService, attendanceRecordService, conceptService}));

        const wi = next.pendingAutoShareWorkItem;
        assert.instanceOf(wi, WorkItem);
        assert.equal(wi.parameters.sessionUUID, "sess-prior");
    });
});
