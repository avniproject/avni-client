// Verifies RosterActions.onSave composes the entity graph correctly and dispatches
// to SessionService.saveOrUpdate with the expected args. Mocks the service layer
// (no in-memory Realm — same convention as the other *Test.js files).

import {assert} from "chai";
import _ from "lodash";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceRecord, Encounter, ProgramEncounter, Session} from "avni-models";
import {RosterActions} from "../../../src/action/attendance/RosterActions";

// Minimal context that returns service stubs by class reference.
function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {
        get: (klass) => map.get(klass.name),
    };
}

function makeAttendanceType({followUpEncounterType = null, absenceReasonConcept = "rc-uuid"} = {}) {
    return {
        uuid: "at-uuid",
        name: "Morning Prayer",
        getFollowUpEncounterTypeUUID: () => followUpEncounterType,
        getAbsenceReasonConceptUUID: () => absenceReasonConcept,
    };
}

function makeGroupSubject() {
    return {
        uuid: "g-uuid",
        nameString: "Class 7A",
        subjectType: {uuid: "st-group", group: true},
    };
}

const STUDENT_SUBJECT_TYPE = {uuid: "st-student", group: false};

function makeBaseState({existingSession = null, followUpEncounterType = null} = {}) {
    return {
        groupSubject: makeGroupSubject(),
        attendanceType: makeAttendanceType({followUpEncounterType}),
        scheduledDate: "2026-05-21",
        existingSession,
        roster: [
            {subjectUUID: "s1", name: "Aarav", status: AttendanceRecord.status.PRESENT, reasonConceptUUID: null},
            {subjectUUID: "s2", name: "Esha", status: AttendanceRecord.status.ABSENT, reasonConceptUUID: null},
            {subjectUUID: "s3", name: "Chirag", status: AttendanceRecord.status.ABSENT, reasonConceptUUID: "sick"},
        ],
        notes: "Started late.",
        absenceReasonAnswers: [],
        followUpEncounterTypeUuid: followUpEncounterType,
    };
}

describe("RosterActions.onSave — atomic save composition", () => {
    let saveOrUpdateSpy;
    let sessionService;
    let groupSubjectService;
    let userInfoService;
    let entityService;
    let formMappingService;
    let individualService;
    let programEnrolmentService;
    let attendanceRecordService;
    let encounterService;
    let programEncounterService;

    beforeEach(() => {
        // The new saveOrUpdate returns voidedFollowUps + skippedFollowUps; the
        // caller uses those to build lastSaveResult, so the spy stub must too.
        saveOrUpdateSpy = jest.fn(() => ({voidedFollowUps: [], skippedFollowUps: []}));
        sessionService = {saveOrUpdate: saveOrUpdateSpy};
        groupSubjectService = {
            getGroupSubjects: () => [
                {memberSubject: {uuid: "s1", voided: false, subjectType: STUDENT_SUBJECT_TYPE}},
            ],
        };
        userInfoService = {getUserInfo: () => ({username: "marker.user"})};
        entityService = {findByUUID: jest.fn()};
        formMappingService = {findProgramUUIDForEncounterType: jest.fn(() => null)};
        // Individuals must carry the matching subjectType so FollowUpResolver's
        // studentLookup filter accepts them. Heterogeneous groups are protected
        // by that filter — mismatched students simply yield null.
        individualService = {
            findByUUID: jest.fn(uuid => ({uuid, nameString: uuid.toUpperCase(), subjectType: STUDENT_SUBJECT_TYPE})),
        };
        programEnrolmentService = {getEnrolmentBySubjectUuidAndProgramUuid: jest.fn(() => null)};
        attendanceRecordService = {findBySession: jest.fn(() => [])};
        // saveOrUpdate handles the encounter lookups internally now; these stubs
        // exist purely to satisfy DI when nothing in the test exercises them.
        encounterService = {findByUUID: jest.fn(() => null)};
        programEncounterService = {findByUUID: jest.fn(() => null)};
    });

    function buildContext() {
        // Re-import service modules so we can map them by class name.
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
            [GroupSubjectService, groupSubjectService],
            [UserInfoService, userInfoService],
            [EntityService, entityService],
            [FormMappingService, formMappingService],
            [IndividualService, individualService],
            [ProgramEnrolmentService, programEnrolmentService],
            [AttendanceRecordService, attendanceRecordService],
            [ConceptService, {getConceptByUUID: () => null}],
            [EncounterService, encounterService],
            [ProgramEncounterService, programEncounterService],
        ]);
    }

    it("passes a fresh Session + AttendanceRecord[] to saveOrUpdate when no follow-up EncounterType is configured", () => {
        const state = makeBaseState({followUpEncounterType: null});

        RosterActions.onSave(state, {}, buildContext());

        assert.equal(saveOrUpdateSpy.mock.calls.length, 1);
        const args = saveOrUpdateSpy.mock.calls[0][0];
        assert.instanceOf(args.session, Session);
        assert.equal(args.session.status, Session.status.HELD);
        assert.equal(args.session.groupSubjectUUID, "g-uuid");
        assert.equal(args.session.attendanceTypeUUID, "at-uuid");
        assert.equal(args.session.notes, "Started late.");
        assert.equal(args.session.markedByUserName, "marker.user");
        assert.equal(args.attendanceRecords.length, 3);
        assert.deepEqual(args.followUps, []);
        assert.deepEqual(args.previousRecords, []);
        assert.deepEqual(args.voidedRecordUUIDs, []);
    });

    it("emits no follow-up encounters when the configured EncounterType is voided / missing", () => {
        entityService.findByUUID.mockReturnValue(null); // voided / not synced
        const state = makeBaseState({followUpEncounterType: "et-uuid"});

        RosterActions.onSave(state, {}, buildContext());

        const args = saveOrUpdateSpy.mock.calls[0][0];
        assert.deepEqual(args.followUps, [], "no follow-ups when EncounterType can't be resolved");
        // But the rest of the save still proceeds — Session + records land.
        assert.instanceOf(args.session, Session);
        assert.equal(args.attendanceRecords.length, 3);
    });

    it("creates a general Encounter follow-up for absent-no-reason students when EncounterType is NOT program-bound", () => {
        const encounterType = {uuid: "et-uuid", name: "Home Visit"};
        entityService.findByUUID.mockReturnValue(encounterType);
        formMappingService.findProgramUUIDForEncounterType.mockReturnValue(null);
        const state = makeBaseState({followUpEncounterType: "et-uuid"});

        RosterActions.onSave(state, {}, buildContext());

        const args = saveOrUpdateSpy.mock.calls[0][0];
        // Only Esha (Absent + no reason) — Aarav is Present, Chirag is Absent with a reason.
        assert.equal(args.followUps.length, 1);
        const [{encounter, schemaName}] = args.followUps;
        assert.equal(schemaName, Encounter.schema.name);
        assert.instanceOf(encounter, Encounter);
        assert.equal(encounter.individual.uuid, "s2");
    });

    it("creates a ProgramEncounter follow-up when the EncounterType is program-bound and an active enrolment exists", () => {
        const encounterType = {uuid: "et-uuid", name: "Counselling"};
        entityService.findByUUID.mockReturnValue(encounterType);
        formMappingService.findProgramUUIDForEncounterType.mockReturnValue("prog-uuid");
        programEnrolmentService.getEnrolmentBySubjectUuidAndProgramUuid.mockReturnValue({uuid: "enr-1", program: {uuid: "prog-uuid"}});
        const state = makeBaseState({followUpEncounterType: "et-uuid"});

        RosterActions.onSave(state, {}, buildContext());

        const args = saveOrUpdateSpy.mock.calls[0][0];
        assert.equal(args.followUps.length, 1);
        assert.equal(args.followUps[0].schemaName, ProgramEncounter.schema.name);
        assert.instanceOf(args.followUps[0].encounter, ProgramEncounter);
    });

    it("filters out students whose subject type doesn't match the inferred member type (heterogeneous group safety)", () => {
        const encounterType = {uuid: "et-uuid", name: "Home Visit"};
        entityService.findByUUID.mockReturnValue(encounterType);
        // s2 belongs to a different subject type — FollowUpResolver.studentLookup
        // returns null for them, so autoCreateFollowUps skips them.
        const OTHER_SUBJECT_TYPE = {uuid: "st-other", group: false};
        individualService.findByUUID = jest.fn(uuid => {
            const subjectType = uuid === "s2" ? OTHER_SUBJECT_TYPE : STUDENT_SUBJECT_TYPE;
            return {uuid, nameString: uuid.toUpperCase(), subjectType};
        });
        const state = makeBaseState({followUpEncounterType: "et-uuid"});

        RosterActions.onSave(state, {}, buildContext());

        const args = saveOrUpdateSpy.mock.calls[0][0];
        // s2 would have been the only follow-up candidate; gets filtered.
        assert.equal(args.followUps.length, 0);
    });

    it("reuses prior AttendanceRecord UUIDs on re-mark (upsert in place, no duplicates)", () => {
        // Existing session with two prior records for s1 + s2; on re-mark the new
        // records should carry those same UUIDs so db.create UpdateMode.Modified
        // replaces the rows instead of inserting new ones.
        const priorR1 = {uuid: "rec-1-prior", subjectUUID: "s1", status: AttendanceRecord.status.PRESENT, followUpEncounterUUID: null, voided: false};
        const priorR2 = {uuid: "rec-2-prior", subjectUUID: "s2", status: AttendanceRecord.status.ABSENT, followUpEncounterUUID: null, voided: false};
        attendanceRecordService.findBySession.mockReturnValue([priorR1, priorR2]);
        const state = makeBaseState();
        state.existingSession = {uuid: "session-existing", status: Session.status.HELD, notes: "old", reasonConceptUUID: null};

        RosterActions.onSave(state, {}, buildContext());

        const args = saveOrUpdateSpy.mock.calls[0][0];
        const uuidBySubject = _.fromPairs(args.attendanceRecords.map(r => [r.subjectUUID, r.uuid]));
        assert.equal(uuidBySubject["s1"], "rec-1-prior");
        assert.equal(uuidBySubject["s2"], "rec-2-prior");
        // s3 was not in priorRecords -> gets a fresh UUID
        assert.notEqual(uuidBySubject["s3"], undefined);
        assert.notEqual(uuidBySubject["s3"], "rec-1-prior");
        assert.notEqual(uuidBySubject["s3"], "rec-2-prior");
        // previousRecords are forwarded as plain snapshots so the service can
        // drive Session.voidStaleFollowUps inside its write transaction.
        assert.equal(args.previousRecords.length, 2);
        assert.equal(args.previousRecords[0].uuid, "rec-1-prior");
    });

    it("cascade-voids AttendanceRecords for members who left the group between marks", () => {
        // s2 was in the prior records but has been removed from the current
        // roster (membershipEndDate set, filtered out at ON_LOAD time). Their
        // AttendanceRecord must be voided so it doesn't sync as live attendance.
        const priorR2 = {uuid: "rec-2-prior", subjectUUID: "s2", status: AttendanceRecord.status.ABSENT, followUpEncounterUUID: null, voided: false};
        attendanceRecordService.findBySession.mockReturnValue([priorR2]);
        const state = makeBaseState();
        state.existingSession = {uuid: "session-existing", status: Session.status.HELD, notes: "", reasonConceptUUID: null};
        // Current roster excludes s2 (the departed member).
        state.roster = [
            {subjectUUID: "s1", name: "Aarav", status: AttendanceRecord.status.PRESENT, reasonConceptUUID: null},
            {subjectUUID: "s3", name: "Chirag", status: AttendanceRecord.status.PRESENT, reasonConceptUUID: null},
        ];

        RosterActions.onSave(state, {}, buildContext());

        const args = saveOrUpdateSpy.mock.calls[0][0];
        assert.deepEqual(args.voidedRecordUUIDs, ["rec-2-prior"]);
    });

    it("refuses to save when the roster is empty (no active group members)", () => {
        const state = makeBaseState();
        state.roster = [];

        const newState = RosterActions.onSave(state, {}, buildContext());

        assert.equal(saveOrUpdateSpy.mock.calls.length, 0);
        assert.equal(newState.saveError, "rosterEmptyError");
    });

    it("returns a lastSaveResult summary that the confirmation dialog can render", () => {
        const encounterType = {uuid: "et-uuid", name: "Home Visit"};
        entityService.findByUUID.mockReturnValue(encounterType);
        const state = makeBaseState({followUpEncounterType: "et-uuid"});

        const newState = RosterActions.onSave(state, {}, buildContext());

        assert.equal(newState.lastSaveResult.createdFollowUps.length, 1);
        assert.equal(newState.lastSaveResult.createdFollowUps[0].encounterTypeName, "Home Visit");
        assert.equal(newState.lastSaveResult.voidedFollowUpCount, 0);
        assert.deepEqual(newState.lastSaveResult.skippedFollowUps, []);
    });
});
