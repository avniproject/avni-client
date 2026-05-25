// Mocks the Realm db (no in-memory Realm — see *TestI.js convention) and
// asserts on what each Attendance-flow service writes and queries.

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceRecord, Encounter, EntityQueue, ProgramEncounter, Session} from "avni-models";
import AttendanceRecordService from "../../src/service/AttendanceRecordService";
import AttendanceTypeService from "../../src/service/AttendanceTypeService";
import CalendarService from "../../src/service/CalendarService";
import FormMappingService from "../../src/service/FormMappingService";
import SessionService from "../../src/service/SessionService";

// Production code references Realm.UpdateMode.Modified as a global (resolved from
// the realm npm package). Stub it for jest.
global.Realm = global.Realm || {UpdateMode: {Modified: "modified"}};

function makeMockDb({
    objectsByName = {},
    primaryKeyByName = {},
} = {}) {
    const writes = {count: 0, creates: []};
    // Cache so multiple db.objects(schema) calls share the same .filtered jest.fn.
    const collectionsBySchema = {};
    const buildCollection = (arr) => {
        const collection = {
            length: arr.length,
            map: (fn) => arr.map(fn),
            forEach: (fn) => arr.forEach(fn),
            filter: (fn) => arr.filter(fn),
            slice: () => arr.slice(),
            filtered: jest.fn(() => buildCollection(arr)),
        };
        for (let i = 0; i < arr.length; i++) collection[i] = arr[i];
        return collection;
    };
    return {
        db: {
            write: jest.fn((fn) => {
                writes.count += 1;
                fn();
            }),
            create: jest.fn((schemaName, entity) => {
                writes.creates.push({schemaName, entity});
                return entity;
            }),
            objects: jest.fn((schemaName) => {
                if (!collectionsBySchema[schemaName]) {
                    const arr = objectsByName[schemaName] || [];
                    const root = buildCollection(arr);
                    if (objectsByName[schemaName + ":filtered"]) {
                        root.filtered = jest.fn(() => buildCollection(objectsByName[schemaName + ":filtered"]));
                    }
                    collectionsBySchema[schemaName] = root;
                }
                return collectionsBySchema[schemaName];
            }),
            objectForPrimaryKey: jest.fn((schemaName, key) => {
                return (primaryKeyByName[schemaName] || {})[key] || null;
            }),
            delete: jest.fn(),
        },
        writes,
    };
}

function makeMockBeanStore(services = {}) {
    return {
        getService: jest.fn((klass) => services[klass.name] || services[klass]),
        get: jest.fn((klass) => services[klass.name] || services[klass]),
    };
}

// ── AttendanceRecordService ──────────────────────────────────────────────────

describe("AttendanceRecordService.findBySession", () => {
    it("filters non-voided records for the given sessionUUID", () => {
        const records = [{uuid: "r1", voided: false, sessionUUID: "s1"}];
        const {db} = makeMockDb({
            objectsByName: {
                [AttendanceRecord.schema.name]: records,
                [AttendanceRecord.schema.name + ":filtered"]: records,
            },
        });
        const svc = new AttendanceRecordService(db, makeMockBeanStore());

        const result = svc.findBySession("s1");

        assert.deepEqual(result, records);
        const filteredCall = db.objects(AttendanceRecord.schema.name).filtered.mock.calls[0];
        assert.match(filteredCall[0], /voided = false/);
        assert.match(filteredCall[0], /sessionUUID = \$0/);
        assert.equal(filteredCall[1], "s1");
    });
});

// ── AttendanceTypeService ────────────────────────────────────────────────────

describe("AttendanceTypeService.findActiveForSubjectType", () => {
    it("returns types sorted by sortOrder ascending", () => {
        const types = [
            {uuid: "t2", sortOrder: 2, subjectTypeUUID: "st1", voided: false},
            {uuid: "t1", sortOrder: 1, subjectTypeUUID: "st1", voided: false},
            {uuid: "t3", sortOrder: 3, subjectTypeUUID: "st1", voided: false},
        ];
        const {db} = makeMockDb({
            objectsByName: {
                AttendanceType: types,
                "AttendanceType:filtered": types,
            },
        });
        const svc = new AttendanceTypeService(db, makeMockBeanStore());

        const result = svc.findActiveForSubjectType("st1");

        assert.deepEqual(result.map((t) => t.uuid), ["t1", "t2", "t3"]);
        const filteredCall = db.objects("AttendanceType").filtered.mock.calls[0];
        assert.match(filteredCall[0], /voided = false/);
        assert.match(filteredCall[0], /subjectTypeUUID = \$0/);
        assert.equal(filteredCall[1], "st1");
    });
});

// ── FormMappingService.findProgramUUIDForEncounterType ───────────────────────

describe("FormMappingService.findProgramUUIDForEncounterType", () => {
    it("returns the programUUID when a ProgramEncounter form mapping exists for this (encType, subjectType)", () => {
        const mapping = {programUUID: "prog-1", form: {formType: "ProgramEncounter"}};
        const {db} = makeMockDb({
            objectsByName: {
                FormMapping: [mapping],
                "FormMapping:filtered": [mapping],
            },
        });
        const svc = new FormMappingService(db, makeMockBeanStore());

        const result = svc.findProgramUUIDForEncounterType(
            {uuid: "et1"},
            {uuid: "st1"}
        );

        assert.equal(result, "prog-1");
        const filteredCall = db.objects("FormMapping").filtered.mock.calls[0];
        assert.match(filteredCall[0], /observationsTypeEntityUUID = \$0/);
        assert.match(filteredCall[0], /form\.formType = \$1/);
        assert.match(filteredCall[0], /subjectType\.uuid = \$2/);
        assert.equal(filteredCall[1], "et1");
        assert.equal(filteredCall[2], "ProgramEncounter");
        assert.equal(filteredCall[3], "st1");
    });

    it("returns null when no ProgramEncounter mapping exists (general encounter type)", () => {
        const {db} = makeMockDb({
            objectsByName: {
                FormMapping: [],
                "FormMapping:filtered": [],
            },
        });
        const svc = new FormMappingService(db, makeMockBeanStore());

        const result = svc.findProgramUUIDForEncounterType(
            {uuid: "et1"},
            {uuid: "st1"}
        );

        assert.isNull(result);
    });
});

// ── SessionService.findExistingSession ───────────────────────────────────────

describe("SessionService.findExistingSession", () => {
    it("filters by (groupSubjectUUID, scheduledDate, attendanceTypeUUID, voided=false)", () => {
        const session = {uuid: "s1"};
        const {db} = makeMockDb({
            objectsByName: {
                [Session.schema.name]: [session],
                [Session.schema.name + ":filtered"]: [session],
            },
        });
        const svc = new SessionService(db, makeMockBeanStore());

        const result = svc.findExistingSession("g1", "2026-05-21", "at1");

        assert.equal(result, session);
        const filteredCall = db.objects(Session.schema.name).filtered.mock.calls[0];
        assert.match(filteredCall[0], /voided = false/);
        assert.match(filteredCall[0], /groupSubjectUUID = \$0/);
        assert.match(filteredCall[0], /scheduledDate = \$1/);
        assert.match(filteredCall[0], /attendanceTypeUUID = \$2/);
        assert.equal(filteredCall[1], "g1");
        assert.equal(filteredCall[2], "2026-05-21");
        assert.equal(filteredCall[3], "at1");
    });

    it("returns undefined when no matching session exists (caller treats as 'no existing session')", () => {
        const {db} = makeMockDb({
            objectsByName: {
                [Session.schema.name]: [],
                [Session.schema.name + ":filtered"]: [],
            },
        });
        const svc = new SessionService(db, makeMockBeanStore());

        const result = svc.findExistingSession("g1", "2026-05-21", "at1");

        assert.isUndefined(result);
    });
});

// ── SessionService.saveOrUpdate — the atomic write ───────────────────────────

describe("SessionService.saveOrUpdate", () => {
    function mkArgs() {
        return {
            session: {uuid: "s1", voided: false},
            attendanceRecords: [
                {uuid: "r1", sessionUUID: "s1", voided: false},
                {uuid: "r2", sessionUUID: "s1", voided: false},
            ],
            followUps: [
                {encounter: {uuid: "e1", updateAudit: jest.fn()}, schemaName: Encounter.schema.name},
                {encounter: {uuid: "e2", updateAudit: jest.fn()}, schemaName: ProgramEncounter.schema.name},
            ],
        };
    }

    function mkEncounterStubs({encountersByUUID = {}, programEncountersByUUID = {}} = {}) {
        return {
            EncounterService: {findByUUID: (uuid) => encountersByUUID[uuid] || null},
            ProgramEncounterService: {findByUUID: (uuid) => programEncountersByUUID[uuid] || null},
            UserInfoService: {getUserInfo: () => ({userUUID: "user-1", name: "marker.user"})},
        };
    }

    it("opens exactly one db.write transaction", () => {
        const {db} = makeMockDb();
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs()));

        svc.saveOrUpdate(mkArgs());

        assert.equal(db.write.mock.calls.length, 1, "expected exactly one db.write call");
    });

    it("persists Session + each AttendanceRecord + each follow-up under the correct schema", () => {
        const {db, writes} = makeMockDb();
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs()));

        svc.saveOrUpdate(mkArgs());

        const entityCreates = writes.creates.filter(c => c.schemaName !== EntityQueue.schema.name);
        const schemas = entityCreates.map(c => c.schemaName).sort();
        assert.deepEqual(schemas, [
            AttendanceRecord.schema.name,
            AttendanceRecord.schema.name,
            Encounter.schema.name,
            ProgramEncounter.schema.name,
            Session.schema.name,
        ].sort());
    });

    it("queues every persisted entity into EntityQueue inside the same transaction", () => {
        const {db, writes} = makeMockDb();
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs()));

        svc.saveOrUpdate(mkArgs());

        const queueCreates = writes.creates.filter(c => c.schemaName === EntityQueue.schema.name);
        // 1 Session + 2 AttendanceRecords + 2 follow-ups = 5 EntityQueue rows
        assert.equal(queueCreates.length, 5);
    });

    it("stamps audit fields on Session, each new AttendanceRecord, and each follow-up encounter", () => {
        const {db} = makeMockDb();
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs()));
        const args = mkArgs();

        svc.saveOrUpdate(args);

        // Session is "new" (no existing row at this uuid) → createdBy + lastModifiedBy both set
        assert.equal(args.session.createdByUUID, "user-1");
        assert.equal(args.session.createdBy, "marker.user");
        assert.equal(args.session.lastModifiedByUUID, "user-1");
        assert.equal(args.session.lastModifiedBy, "marker.user");
        // Each AttendanceRecord likewise
        args.attendanceRecords.forEach(r => {
            assert.equal(r.createdByUUID, "user-1");
            assert.equal(r.lastModifiedByUUID, "user-1");
        });
        // Follow-up encounters route through their own updateAudit(userInfo, true, false)
        args.followUps.forEach(({encounter}) => {
            assert.equal(encounter.updateAudit.mock.calls.length, 1);
            const [userInfoArg, isNewArg, isGettingFilledArg] = encounter.updateAudit.mock.calls[0];
            assert.equal(userInfoArg.userUUID, "user-1");
            assert.equal(isNewArg, true);
            assert.equal(isGettingFilledArg, false);
        });
    });

    it("preserves prior createdBy on re-mark (Session row already exists)", () => {
        const priorSession = {uuid: "s1", voided: false, createdByUUID: "prior-user", createdBy: "Prior User"};
        const {db} = makeMockDb({
            primaryKeyByName: {[Session.schema.name]: {"s1": priorSession}},
        });
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs()));
        const args = mkArgs();  // args.session has no createdBy fields set

        svc.saveOrUpdate(args);

        // Re-mark must NOT overwrite createdBy — copy from existing row
        assert.equal(args.session.createdByUUID, "prior-user");
        assert.equal(args.session.createdBy, "Prior User");
        // lastModifiedBy always reflects the current actor
        assert.equal(args.session.lastModifiedByUUID, "user-1");
    });

    it("cascade-voids an AttendanceRecord (via voidedRecordUUIDs) and its linked follow-up encounter in the same transaction", () => {
        // Departed-member case: the AttendanceRecord exists in Realm, the linked
        // follow-up Encounter is scheduled (no observations) — both flip voided.
        const record = {uuid: "rec-departed", followUpEncounterUUID: "stale-1", voided: false};
        const stale = {uuid: "stale-1", voided: false, observations: []};
        const {db, writes} = makeMockDb({
            primaryKeyByName: {[AttendanceRecord.schema.name]: {"rec-departed": record}},
        });
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs({
            encountersByUUID: {"stale-1": stale},
        })));

        const result = svc.saveOrUpdate({
            session: {uuid: "s1"},
            voidedRecordUUIDs: ["rec-departed"],
        });

        assert.equal(record.voided, true, "departed-member record should be voided in place");
        assert.equal(stale.voided, true, "linked follow-up should cascade-void");
        assert.equal(db.write.mock.calls.length, 1);
        assert.deepEqual(result.voidedFollowUps, [{uuid: "stale-1"}]);
        const queueRows = writes.creates.filter(c => c.schemaName === EntityQueue.schema.name);
        // Session + AttendanceRecord + follow-up = 3 queue entries
        assert.equal(queueRows.length, 3);
    });

    it("surfaces skippedFollowUps when a linked follow-up already has observations", () => {
        const record = {uuid: "rec-departed", followUpEncounterUUID: "stale-1", voided: false};
        const followUpWithObs = {uuid: "stale-1", voided: false, observations: [{concept: "c1"}]};
        const {db} = makeMockDb({
            primaryKeyByName: {[AttendanceRecord.schema.name]: {"rec-departed": record}},
        });
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs({
            encountersByUUID: {"stale-1": followUpWithObs},
        })));

        const result = svc.saveOrUpdate({
            session: {uuid: "s1"},
            voidedRecordUUIDs: ["rec-departed"],
        });

        assert.equal(record.voided, true, "record still voids");
        assert.equal(followUpWithObs.voided, false, "follow-up with observations stays live");
        assert.deepEqual(result.skippedFollowUps, [{uuid: "stale-1"}]);
        assert.deepEqual(result.voidedFollowUps, []);
    });

    it("ignores voidedRecordUUIDs that are missing or already voided", () => {
        const alreadyVoided = {uuid: "rv-1", followUpEncounterUUID: null, voided: true};
        const {db, writes} = makeMockDb({
            primaryKeyByName: {[AttendanceRecord.schema.name]: {"rv-1": alreadyVoided}},
        });
        const svc = new SessionService(db, makeMockBeanStore(mkEncounterStubs()));

        svc.saveOrUpdate({
            session: {uuid: "s1"},
            voidedRecordUUIDs: ["rv-1", "missing"],
        });

        // Only the Session itself queues — neither already-voided nor missing voids add rows.
        const queueRows = writes.creates.filter(c => c.schemaName === EntityQueue.schema.name);
        assert.equal(queueRows.length, 1, "only the Session itself should queue");
    });
});

// ── SessionService.voidSession — cascade ─────────────────────────────────────

describe("SessionService.voidSession", () => {
    function mkEncounterStubs({encountersByUUID = {}, programEncountersByUUID = {}} = {}) {
        return {
            EncounterService: {findByUUID: (uuid) => encountersByUUID[uuid] || null},
            ProgramEncounterService: {findByUUID: (uuid) => programEncountersByUUID[uuid] || null},
            UserInfoService: {getUserInfo: () => ({userUUID: "user-1", name: "marker.user"})},
        };
    }

    it("voids Session + each AttendanceRecord + each linked follow-up encounter (no observations)", () => {
        const session = {uuid: "s1", voided: false};
        const records = [
            {uuid: "r1", sessionUUID: "s1", followUpEncounterUUID: "e1", voided: false},
            {uuid: "r2", sessionUUID: "s1", followUpEncounterUUID: null, voided: false},
        ];
        const followUp = {uuid: "e1", voided: false, observations: []};
        const {db} = makeMockDb({
            primaryKeyByName: {[Session.schema.name]: {"s1": session}},
        });
        const svc = new SessionService(db, makeMockBeanStore({
            AttendanceRecordService: {findBySession: jest.fn(() => records)},
            ...mkEncounterStubs({encountersByUUID: {"e1": followUp}}),
        }));

        const result = svc.voidSession("s1");

        assert.equal(session.voided, true);
        assert.equal(records[0].voided, true);
        assert.equal(records[1].voided, true);
        assert.equal(followUp.voided, true);
        assert.equal(result.voidedRecordCount, 2);
        assert.equal(result.voidedFollowUpCount, 1);
        assert.deepEqual(result.skippedFollowUps, []);
        assert.equal(db.write.mock.calls.length, 1, "all in one transaction");
    });

    it("skips follow-up encounters that already have observations and surfaces them in skippedFollowUps", () => {
        const session = {uuid: "s1", voided: false};
        const records = [{uuid: "r1", sessionUUID: "s1", followUpEncounterUUID: "e1", voided: false}];
        const followUpWithObs = {uuid: "e1", voided: false, observations: [{concept: "c1", value: "v1"}]};
        const {db} = makeMockDb({
            primaryKeyByName: {[Session.schema.name]: {"s1": session}},
        });
        const svc = new SessionService(db, makeMockBeanStore({
            AttendanceRecordService: {findBySession: jest.fn(() => records)},
            ...mkEncounterStubs({encountersByUUID: {"e1": followUpWithObs}}),
        }));

        const result = svc.voidSession("s1");

        assert.equal(session.voided, true);
        assert.equal(followUpWithObs.voided, false, "encounter with observations must NOT be voided");
        assert.equal(result.voidedFollowUpCount, 0);
        assert.deepEqual(result.skippedFollowUps, [{uuid: "e1"}]);
    });

    it("is idempotent — no-op when the Session is already voided", () => {
        const session = {uuid: "s1", voided: true};
        const {db, writes} = makeMockDb({
            primaryKeyByName: {[Session.schema.name]: {"s1": session}},
        });
        const svc = new SessionService(db, makeMockBeanStore({
            AttendanceRecordService: {findBySession: jest.fn(() => [])},
            ...mkEncounterStubs(),
        }));

        const result = svc.voidSession("s1");

        assert.equal(result.voidedRecordCount, 0);
        assert.equal(result.voidedFollowUpCount, 0);
        const entityCreates = writes.creates.filter(c => c.schemaName !== EntityQueue.schema.name);
        assert.equal(entityCreates.length, 0);
    });

    it("falls through Encounter → ProgramEncounter when looking up a follow-up by UUID", () => {
        const session = {uuid: "s1", voided: false};
        const records = [{uuid: "r1", sessionUUID: "s1", followUpEncounterUUID: "pe-1", voided: false}];
        const programFollowUp = {uuid: "pe-1", voided: false, observations: []};
        const {db, writes} = makeMockDb({
            primaryKeyByName: {[Session.schema.name]: {"s1": session}},
        });
        const svc = new SessionService(db, makeMockBeanStore({
            AttendanceRecordService: {findBySession: jest.fn(() => records)},
            ...mkEncounterStubs({programEncountersByUUID: {"pe-1": programFollowUp}}),
        }));

        svc.voidSession("s1");

        assert.equal(programFollowUp.voided, true);
        const queuedSchemas = writes.creates
            .filter(c => c.schemaName === EntityQueue.schema.name)
            .map(c => c.entity);
        assert.isAbove(queuedSchemas.length, 0);
    });
});

// ── SessionService.summaryForDate ────────────────────────────────────────────

describe("SessionService.summaryForDate", () => {
    it("splits Held vs DidntHappen attendanceType UUIDs for the date strip dots", () => {
        const sessions = [
            {attendanceTypeUUID: "t1", status: Session.status.HELD},
            {attendanceTypeUUID: "t2", status: Session.status.DIDNT_HAPPEN},
            {attendanceTypeUUID: "t3", status: Session.status.HELD},
        ];
        const {db} = makeMockDb({
            objectsByName: {
                [Session.schema.name]: sessions,
                [Session.schema.name + ":filtered"]: sessions,
            },
        });
        const svc = new SessionService(db, makeMockBeanStore());

        const result = svc.summaryForDate("g1", "2026-05-21");

        assert.deepEqual(result.held.sort(), ["t1", "t3"]);
        assert.deepEqual(result.didntHappen, ["t2"]);
    });
});

// ── SessionService.countPendingSlots ─────────────────────────────────────────

describe("SessionService.countPendingSlots", () => {
    it("returns 0 when no calendar resolves", () => {
        const svc = new SessionService(makeMockDb().db, makeMockBeanStore());
        const count = svc.countPendingSlots("g1", null, [], [{uuid: "t1"}], "2026-05-01");
        assert.equal(count, 0);
    });

    it("returns 0 when no attendance types are configured", () => {
        const calendar = {dayType: () => "working_day"};
        const svc = new SessionService(makeMockDb().db, makeMockBeanStore());
        const count = svc.countPendingSlots("g1", calendar, [], [], "2026-05-01");
        assert.equal(count, 0);
    });
});

// ── CalendarService.dayStatusFor ─────────────────────────────────────────────

describe("CalendarService.dayStatusFor", () => {
    it("returns {calendar:null, dayType:null} when no calendar resolves for the subject", () => {
        const {db} = makeMockDb({
            objectsByName: {
                Calendar: [],
                "Calendar:filtered": [],
            },
        });
        const svc = new CalendarService(db, makeMockBeanStore());

        const result = svc.dayStatusFor({lowestAddressLevel: null}, new Date("2026-05-21"));

        assert.isNull(result.calendar);
        assert.isNull(result.dayType);
    });

    it("returns the resolved calendar's dayType and the matching marker (if any)", () => {
        const calendar = {
            uuid: "cal-1",
            voided: false,
            addressLevelUUID: null,
            dayType: jest.fn(() => "public_holiday"),
        };
        const marker = {
            calendarUUID: "cal-1",
            markerDate: "2026-11-09",
            isWorking: false,
            voided: false,
            name: "Diwali",
        };
        const {db} = makeMockDb({
            objectsByName: {
                Calendar: [calendar],
                "Calendar:filtered": [calendar],
                CalendarDateMarker: [marker],
                "CalendarDateMarker:filtered": [marker],
            },
        });
        const svc = new CalendarService(db, makeMockBeanStore());

        const result = svc.dayStatusFor({lowestAddressLevel: null}, new Date("2026-11-09"));

        assert.equal(result.calendar, calendar);
        assert.equal(result.dayType, "public_holiday");
        assert.equal(result.marker.name, "Diwali");
    });
});
