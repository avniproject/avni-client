/**
 * The scheduled, overdue and completed-visit cards open the same subject list. Each row shows the
 * subject, the visit and, on the completed card only, enrolment badges. The visit history behind
 * the row is never shown, and loading it is what made each row expensive.
 *
 * One subject per card per source, so each of the six call sites has an assertion of its own:
 * reverting any one of them turns its test red.
 *
 * Tracking issue: avniproject/avni-client#2105.
 *   npx jest --selectProjects integration --testPathPattern VisitCardListTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {EntityMappingConfig} from "openchs-models";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import IndividualService from "../../../src/service/IndividualService";
import CustomFilterService from "../../../src/service/CustomFilterService";
import PrivilegeService from "../../../src/service/PrivilegeService";
import {open} from "@op-engineering/op-sqlite";

const TODAY = new Date(2026, 0, 15);
const DAY = 24 * 60 * 60 * 1000;
const daysFrom = (days) => new Date(TODAY.getTime() + days * DAY);
const ANC = "et-anc";
const HOME_VISIT = "et-home";

describe("visit card lists", () => {
    let rawDb, service;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        proxy.write(() => {
            const create = (schema, data) => proxy.create(schema, data, true, {skipHydration: true});
            create("SubjectType", {uuid: "st", name: "Person", voided: false, active: true, type: "Person"});
            create("Program", {uuid: "pr", name: "Mother", voided: false, active: true, colour: "#000"});
            create("EncounterType", {uuid: ANC, name: "ANC", voided: false, active: true});
            create("EncounterType", {uuid: HOME_VISIT, name: "Home visit", voided: false, active: true});

            const subject = (uuid) => create("Individual", {uuid, firstName: uuid, registrationDate: daysFrom(-400), voided: false, subjectType: {uuid: "st"}});
            // A program-visit subject: enrolled, with two old completed visits the row never shows.
            const enrolled = (uuid) => {
                subject(uuid);
                create("ProgramEnrolment", {uuid: `${uuid}-enl`, individual: {uuid}, program: {uuid: "pr"}, enrolmentDateTime: daysFrom(-400), voided: false});
                for (const n of [1, 2]) create("ProgramEncounter", {uuid: `${uuid}-old-${n}`, programEnrolment: {uuid: `${uuid}-enl`}, encounterType: {uuid: ANC}, encounterDateTime: daysFrom(-300 - n), voided: false});
            };
            // A general-visit subject: enrolled too, so a badge strip exists to prefetch or not, with an old home visit.
            const general = (uuid) => {
                enrolled(uuid);
                create("Encounter", {uuid: `${uuid}-old-home`, individual: {uuid}, encounterType: {uuid: HOME_VISIT}, encounterDateTime: daysFrom(-300), voided: false});
            };
            const programVisit = (uuid, fields) => create("ProgramEncounter", {uuid: `${uuid}-visit`, programEnrolment: {uuid: `${uuid}-enl`}, encounterType: {uuid: ANC}, voided: false, ...fields});
            const generalVisit = (uuid, fields) => create("Encounter", {uuid: `${uuid}-visit`, individual: {uuid}, encounterType: {uuid: HOME_VISIT}, voided: false, ...fields});

            const due = {earliestVisitDateTime: TODAY, maxVisitDateTime: daysFrom(3)};
            const late = {earliestVisitDateTime: daysFrom(-10), maxVisitDateTime: daysFrom(-5)};
            const done = {earliestVisitDateTime: daysFrom(-1), maxVisitDateTime: daysFrom(2), encounterDateTime: TODAY};

            enrolled("prog-scheduled"); programVisit("prog-scheduled", due);
            general("gen-scheduled"); generalVisit("gen-scheduled", due);
            enrolled("prog-overdue"); programVisit("prog-overdue", late);
            general("gen-overdue"); generalVisit("gen-overdue", late);
            enrolled("prog-completed"); programVisit("prog-completed", done);
            general("gen-completed"); generalVisit("gen-completed", done);
        });
        proxy.buildReferenceCache([
            {schemaName: "SubjectType", depth: 1, skipLists: true},
            {schemaName: "Program", depth: 1, skipLists: true},
            {schemaName: "EncounterType", depth: 1, skipLists: true}
        ]);

        const repositoryFactory = new RepositoryFactory(proxy);
        const stubs = new Map([
            [CustomFilterService, {}],
            [PrivilegeService, {hasAllPrivileges: () => true, allowedEntityTypeUUIDListForCriteria: () => []}]
        ]);
        service = new IndividualService(proxy, {
            getRepositoryFactory: () => repositoryFactory,
            getService: (klass) => stubs.get(klass)
        });
    });

    afterEach(() => rawDb && rawDb.close());

    // A prefetched list is a plain data property; a deferred one is an accessor.
    const isPrefetched = (entity, propName) => !Object.getOwnPropertyDescriptor(entity.that || entity, propName).get;
    const rowFor = (rows, subjectUuid) => {
        const row = rows.find(r => r.individual.uuid === subjectUuid);
        assert.exists(row, `${subjectUuid} is not on the card`);
        return row;
    };
    // Scheduled and overdue rows carry the visit; completed rows carry none (visitName is empty), so
    // their enrolment is reached through the badge strip instead.
    const enrolmentOf = (row) => row.visitInfo.visitName.length > 0
        ? row.visitInfo.visitName[0].encounter.programEnrolment
        : row.individual.that.enrolments[0];

    // Program visit rows reach the subject through the enrolment; that enrolment's history is the cost.
    const assertProgramRowShallow = (row, {badges}) => {
        assert.isFalse(isPrefetched(enrolmentOf(row), "encounters"), "enrolment history loaded");
        assert.isFalse(isPrefetched(row.individual, "encounters"), "subject history loaded");
        assert.strictEqual(isPrefetched(row.individual, "enrolments"), badges, "badge strip");
    };
    const assertGeneralRowShallow = (row, {badges}) => {
        assert.isFalse(isPrefetched(row.individual, "encounters"), "subject history loaded");
        assert.strictEqual(isPrefetched(row.individual, "enrolments"), badges, "badge strip");
    };

    // Scheduled and overdue hide the badge strip (IndividualDetails, isScheduledOrOverdueView).
    describe("scheduled card", () => {
        const rows = () => service.allScheduledVisitsIn(TODAY, [], "", "", true, true);

        it("shows exactly the visits due today", () => {
            assert.sameMembers(rows().map(r => r.individual.uuid), ["prog-scheduled", "gen-scheduled"]);
        });
        it("loads a program visit row without its history", () => assertProgramRowShallow(rowFor(rows(), "prog-scheduled"), {badges: false}));
        it("loads a general visit row without its history", () => assertGeneralRowShallow(rowFor(rows(), "gen-scheduled"), {badges: false}));
    });

    describe("overdue card", () => {
        const rows = () => service.allOverdueVisitsIn(TODAY, [], "", "", true, true);

        it("shows exactly the visits past their window", () => {
            assert.sameMembers(rows().map(r => r.individual.uuid), ["prog-overdue", "gen-overdue"]);
        });
        it("loads a program visit row without its history", () => assertProgramRowShallow(rowFor(rows(), "prog-overdue"), {badges: false}));
        it("loads a general visit row without its history", () => assertGeneralRowShallow(rowFor(rows(), "gen-overdue"), {badges: false}));
    });

    describe("completed-visits card", () => {
        const rows = () => service.recentlyCompletedVisitsIn(TODAY, [], "", "", true, true);

        it("shows exactly the visits completed today", () => {
            assert.sameMembers(rows().map(r => r.individual.uuid), ["prog-completed", "gen-completed"]);
        });
        it("loads a program visit row with badges and without history", () => assertProgramRowShallow(rowFor(rows(), "prog-completed"), {badges: true}));
        it("loads a general visit row with badges and without history", () => assertGeneralRowShallow(rowFor(rows(), "gen-completed"), {badges: true}));
    });
});
