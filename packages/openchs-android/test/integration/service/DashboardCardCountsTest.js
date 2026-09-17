/**
 * A dashboard card must count people, not rows, and must equal the number of rows in its
 * own drill-down. Each fixture gives at least one subject two or more qualifying rows.
 *
 * Run: npx jest --selectProjects integration test/integration/service/DashboardCardCountsTest.js
 */
import {assert} from "chai";
import moment from "moment";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {CustomFilter, EntityMappingConfig, Encounter, Individual, ProgramEncounter, ProgramEnrolment} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import IndividualService from "../../../src/service/IndividualService";
import CustomFilterService from "../../../src/service/CustomFilterService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import {open} from "@op-engineering/op-sqlite";

const TODAY = new Date(2026, 0, 15);
const YESTERDAY = new Date(2026, 0, 14);
const LAST_WEEK = new Date(2026, 0, 8);

let seq = 0;
const uuid = (prefix) => `${prefix}-${++seq}`;

const SUBJECT_TYPE = "st-1";
const PROGRAM = "prog-1";
const PROGRAM_ENC_TYPE_A = "pet-a";
const PROGRAM_ENC_TYPE_B = "pet-b";
const GENERAL_ENC_TYPE = "get-a";

describe("dashboard card counts are people, not rows", () => {
    let rawDb, proxy, service, privileges, privilegeLookups, conceptScan;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        proxy.write(() => {
            proxy.create("SubjectType", {uuid: SUBJECT_TYPE, name: "Person", voided: false, active: true, type: "Person"}, true, {skipHydration: true});
            proxy.create("Program", {uuid: PROGRAM, name: "Child", voided: false, active: true, colour: "#000"}, true, {skipHydration: true});
            proxy.create("EncounterType", {uuid: PROGRAM_ENC_TYPE_A, name: "Activity", voided: false, active: true}, true, {skipHydration: true});
            proxy.create("EncounterType", {uuid: PROGRAM_ENC_TYPE_B, name: "Assessment", voided: false, active: true}, true, {skipHydration: true});
            proxy.create("EncounterType", {uuid: GENERAL_ENC_TYPE, name: "Screening", voided: false, active: true}, true, {skipHydration: true});
        });
        proxy.buildReferenceCache([
            {schemaName: "SubjectType", depth: 1, skipLists: true},
            {schemaName: "Program", depth: 1, skipLists: true},
            {schemaName: "EncounterType", depth: 1, skipLists: true}
        ]);

        // Default: user holds every privilege, so the privilege filter is a no-op.
        privileges = {allowAll: true, programEncounterTypes: [], generalEncounterTypes: []};
        privilegeLookups = 0;
        const privilegeService = {
            hasAllPrivileges: () => (privilegeLookups += 1, privileges.allowAll),
            allowedEntityTypeUUIDListForCriteria: (ignored, param) =>
                param === "programEncounterTypeUuid" ? privileges.programEncounterTypes : privileges.generalEncounterTypes
        };
        // A concept filter's subject scan is the expensive step, so the stub counts how often it runs.
        conceptScan = {calls: 0, matches: []};
        const customFilterService = {
            getFilterQueryByTypeFunctionV2: () => null,
            getSubjects: () => (conceptScan.calls += 1, conceptScan.matches)
        };
        const stubs = new Map([[CustomFilterService, customFilterService], [PrivilegeService, privilegeService]]);
        const repositoryFactory = new RepositoryFactory(proxy);
        const context = {
            getRepositoryFactory: () => repositoryFactory,
            getService: (klass) => stubs.get(klass)
        };
        service = new IndividualService(proxy, context);
    });

    afterEach(() => rawDb && rawDb.close());

    function subject(name) {
        const u = uuid("ind");
        proxy.write(() => proxy.create("Individual", {
            uuid: u, firstName: name, lastName: "T", registrationDate: LAST_WEEK,
            voided: false, subjectType: {uuid: SUBJECT_TYPE}
        }, true, {skipHydration: true}));
        return u;
    }

    function enrolment(individualUuid, enrolmentDateTime = LAST_WEEK) {
        const u = uuid("enr");
        proxy.write(() => proxy.create("ProgramEnrolment", {
            uuid: u, individual: {uuid: individualUuid}, program: {uuid: PROGRAM},
            enrolmentDateTime, voided: false
        }, true, {skipHydration: true}));
        return u;
    }

    function programEncounter(enrolmentUuid, {encounterType = PROGRAM_ENC_TYPE_A, earliest, max, encounterDateTime = null}) {
        const u = uuid("pe");
        proxy.write(() => proxy.create("ProgramEncounter", {
            uuid: u, programEnrolment: {uuid: enrolmentUuid}, encounterType: {uuid: encounterType},
            name: "Visit", earliestVisitDateTime: earliest, maxVisitDateTime: max,
            encounterDateTime, cancelDateTime: null, voided: false
        }, true, {skipHydration: true}));
        return u;
    }

    function generalEncounter(individualUuid, {encounterType = GENERAL_ENC_TYPE, earliest, max, encounterDateTime = null}) {
        const u = uuid("enc");
        proxy.write(() => proxy.create("Encounter", {
            uuid: u, individual: {uuid: individualUuid}, encounterType: {uuid: encounterType},
            name: "Visit", earliestVisitDateTime: earliest, maxVisitDateTime: max,
            encounterDateTime, cancelDateTime: null, voided: false
        }, true, {skipHydration: true}));
        return u;
    }

    const dueToday = {earliest: moment(TODAY).subtract(2, "day").toDate(), max: moment(TODAY).add(5, "day").toDate()};
    const overdue = {earliest: moment(TODAY).subtract(10, "day").toDate(), max: moment(TODAY).subtract(3, "day").toDate()};

    const scheduledCount = () => service.countScheduledVisits(TODAY, [], "", "");
    const scheduledList = () => service.allScheduledVisitsIn(TODAY, [], "", "");
    const overdueCount = () => service.countOverdueVisits(TODAY, [], "", "");
    const overdueList = () => service.allOverdueVisitsIn(TODAY, [], "", "");
    const recentVisitsCount = () => service.countRecentlyCompletedVisits(TODAY, [], "", "");
    const recentVisitsList = () => service.recentlyCompletedVisitsIn(TODAY, [], "", "", true, true);
    const recentEnrolmentsCount = () => service.countRecentlyEnrolled(TODAY, [], "");
    const recentEnrolmentsList = () => service.recentlyEnrolled(TODAY, [], "");

    it("fixture 1 — one subject with two due program encounters counts as one person", () => {
        const enr = enrolment(subject("Tts"));
        programEncounter(enr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_A});
        programEncounter(enr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_B});

        assert.equal(scheduledList().length, 1);
        assert.equal(scheduledCount(), 1);
    });

    it("fixture 2 — one subject with a due program visit and a due general visit counts as one person", () => {
        const ind = subject("Tts");
        programEncounter(enrolment(ind), dueToday);
        generalEncounter(ind, dueToday);

        assert.equal(scheduledList().length, 1);
        assert.equal(scheduledCount(), 1);
    });

    it("fixture 3 — a subject whose only due visit needs a performVisit privilege the user lacks is not counted", () => {
        privileges = {allowAll: false, programEncounterTypes: [], generalEncounterTypes: []};
        programEncounter(enrolment(subject("Tts")), dueToday);

        assert.equal(scheduledList().length, 0);
        assert.equal(scheduledCount(), 0);
    });

    it("fixture 3b — overdue honours the same performVisit privilege", () => {
        privileges = {allowAll: false, programEncounterTypes: [], generalEncounterTypes: []};
        programEncounter(enrolment(subject("Tts")), overdue);

        assert.equal(overdueList().length, 0);
        assert.equal(overdueCount(), 0);
    });

    it("fixture 3c — a subject is counted when the user holds performVisit on that type", () => {
        privileges = {allowAll: false, programEncounterTypes: [PROGRAM_ENC_TYPE_A], generalEncounterTypes: []};
        programEncounter(enrolment(subject("Tts")), {...dueToday, encounterType: PROGRAM_ENC_TYPE_A});

        assert.equal(scheduledList().length, 1);
        assert.equal(scheduledCount(), 1);
    });

    it("fixture 3d — a subject with one allowed and one disallowed due visit is still counted once", () => {
        privileges = {allowAll: false, programEncounterTypes: [PROGRAM_ENC_TYPE_A], generalEncounterTypes: []};
        const enr = enrolment(subject("Tts"));
        programEncounter(enr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_A});
        programEncounter(enr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_B});

        assert.equal(scheduledList().length, 1);
        assert.equal(scheduledCount(), 1);
    });

    it("fixture 3e — the privilege filter spans several allowed types and both encounter tables", () => {
        privileges = {allowAll: false, programEncounterTypes: [PROGRAM_ENC_TYPE_A, PROGRAM_ENC_TYPE_B], generalEncounterTypes: [GENERAL_ENC_TYPE]};
        programEncounter(enrolment(subject("A")), {...dueToday, encounterType: PROGRAM_ENC_TYPE_B});
        generalEncounter(subject("B"), dueToday);

        assert.equal(scheduledList().length, 2);
        assert.equal(scheduledCount(), 2);
    });

    it("the drill-down resolves the performVisit rule once, not per row", () => {
        privileges = {allowAll: false, programEncounterTypes: [PROGRAM_ENC_TYPE_A], generalEncounterTypes: [GENERAL_ENC_TYPE]};
        const enr = enrolment(subject("A"));
        programEncounter(enr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_A});
        programEncounter(enr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_B});
        generalEncounter(subject("B"), dueToday);
        privilegeLookups = 0;

        assert.equal(scheduledList().length, 2);
        assert.equal(privilegeLookups, 1);
    });

    it("scheduled and overdue counts use a privilege lookup passed in rather than repeating it", () => {
        programEncounter(enrolment(subject("A")), dueToday);
        generalEncounter(subject("B"), overdue);
        const nothingAllowed = {allowedEncounterTypeUuids: {programEncounterTypes: [], encounterTypes: []}};
        privilegeLookups = 0;

        assert.equal(service.countScheduledVisits(TODAY, [], "", "", nothingAllowed), 0);
        assert.equal(service.countOverdueVisits(TODAY, [], "", "", nothingAllowed), 0);
        assert.equal(privilegeLookups, 0);
    });

    it("counts skip a visit table exactly when the drill-down skips it", () => {
        programEncounter(enrolment(subject("Program only")), dueToday);
        generalEncounter(subject("General only"), dueToday);
        const programOnly = {queryProgramEncounter: true, queryGeneralEncounter: false};
        const generalOnly = {queryProgramEncounter: false, queryGeneralEncounter: true};

        assert.equal(service.allScheduledVisitsIn(TODAY, [], "", "", true, false).length, 1);
        assert.equal(service.countScheduledVisits(TODAY, [], "", "", programOnly), 1);
        assert.equal(service.allScheduledVisitsIn(TODAY, [], "", "", false, true).length, 1);
        assert.equal(service.countScheduledVisits(TODAY, [], "", "", generalOnly), 1);
        assert.equal(service.countScheduledVisits(TODAY, [], "", "", {queryProgramEncounter: false, queryGeneralEncounter: false}), 0);
    });

    it("overdue and recently completed counts honour the same table flags", () => {
        programEncounter(enrolment(subject("A")), overdue);
        generalEncounter(subject("B"), overdue);
        programEncounter(enrolment(subject("C")), {...dueToday, encounterDateTime: TODAY});
        generalEncounter(subject("D"), {...dueToday, encounterDateTime: TODAY});

        assert.equal(service.countOverdueVisits(TODAY, [], "", "", {queryGeneralEncounter: false}), 1);
        assert.equal(service.countOverdueVisits(TODAY, [], "", ""), 2);
        assert.equal(service.recentlyCompletedVisitsIn(TODAY, [], "", "", false, true).length, 1);
        assert.equal(service.countRecentlyCompletedVisits(TODAY, [], "", "", undefined, {queryProgramEncounter: false}), 1);
        assert.equal(service.countRecentlyCompletedVisits(TODAY, [], "", ""), 2);
    });

    it("a card runs the concept filter scan once, not once per visit table", () => {
        const matching = subject("Matches");
        programEncounter(enrolment(matching), dueToday);
        generalEncounter(matching, dueToday);
        const other = subject("Does not match");
        programEncounter(enrolment(other), dueToday);
        generalEncounter(other, dueToday);
        conceptScan.matches = [matching];
        const conceptFilter = {
            type: CustomFilter.type.Concept, dataType: "Text", filterValue: "x",
            toDisplayText: () => "Concept", getScope: () => null, getConceptUUID: () => "concept-1", getScopeParameters: () => null
        };

        assert.equal(service.countScheduledVisits(TODAY, [conceptFilter], "", ""), 1);
        assert.equal(conceptScan.calls, 1);
    });

    it("fixture 4 — one subject with two enrolments in the window counts as one person", () => {
        const ind = subject("Tts");
        enrolment(ind, TODAY);
        enrolment(ind, YESTERDAY);

        assert.equal(recentEnrolmentsList().length, 1);
        assert.equal(recentEnrolmentsCount(), 1);
    });

    it("fixture 5 — the reported repro: four due visits across two subjects counts two people", () => {
        const tts = subject("Tts dind");
        const ttsEnr = enrolment(tts);
        programEncounter(ttsEnr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_A});
        programEncounter(ttsEnr, {...dueToday, encounterType: PROGRAM_ENC_TYPE_B});
        generalEncounter(tts, dueToday);
        programEncounter(enrolment(subject("tets ijd")), dueToday);

        assert.equal(scheduledList().length, 2);
        assert.equal(scheduledCount(), 2);
    });

    it("fixture 6 — five completed visits across two subjects counts two people", () => {
        const oneEnr = enrolment(subject("Tts dind"));
        for (let i = 0; i < 4; i++) programEncounter(oneEnr, {...dueToday, encounterDateTime: TODAY});
        programEncounter(enrolment(subject("tets ijd")), {...dueToday, encounterDateTime: TODAY});

        assert.equal(recentVisitsList().length, 2);
        assert.equal(recentVisitsCount(), 2);
    });

    it("fixture 6b — recent visits dedupes a subject holding both a program and a general completed visit", () => {
        const ind = subject("Tts dind");
        programEncounter(enrolment(ind), {...dueToday, encounterDateTime: TODAY});
        generalEncounter(ind, {...dueToday, encounterDateTime: TODAY});

        assert.equal(recentVisitsList().length, 1);
        assert.equal(recentVisitsCount(), 1);
    });

    it("fixture 7 — control: two subjects with exactly one qualifying row each stay at two", () => {
        programEncounter(enrolment(subject("A")), dueToday);
        programEncounter(enrolment(subject("B")), dueToday);

        assert.equal(scheduledList().length, 2);
        assert.equal(scheduledCount(), 2);
    });

    it("fixture 7b — control: overdue with one qualifying row each stays at two", () => {
        programEncounter(enrolment(subject("A")), overdue);
        programEncounter(enrolment(subject("B")), overdue);

        assert.equal(overdueList().length, 2);
        assert.equal(overdueCount(), 2);
    });

    it("fixture 8 — control: recent registrations and total already count subjects and do not move", () => {
        const a = subject("A");
        subject("B");
        enrolment(a, TODAY);
        enrolment(a, YESTERDAY);

        assert.equal(service.countAllIn(TODAY, [], ""), 2);
        assert.equal(service.allInV2(TODAY, [], "").length, 2);
        assert.equal(service.countRecentlyRegistered(TODAY, [], ""), 0);
    });

    it("fixture 5b — overdue over-counts the same way scheduled does", () => {
        const tts = subject("Tts dind");
        const ttsEnr = enrolment(tts);
        programEncounter(ttsEnr, {...overdue, encounterType: PROGRAM_ENC_TYPE_A});
        programEncounter(ttsEnr, {...overdue, encounterType: PROGRAM_ENC_TYPE_B});
        generalEncounter(tts, overdue);
        programEncounter(enrolment(subject("tets ijd")), overdue);

        assert.equal(overdueList().length, 2);
        assert.equal(overdueCount(), 2);
    });
});
