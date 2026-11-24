/**
 * The DeleteDrafts job on a SQLite database built from the generated schema. On SQLite
 * a draft's observations and locations are columns of the draft row, not separate
 * records, so this checks the delete goes through the draft services end to end.
 *
 * Run: npx jest --selectProjects integration --testPathPattern DeleteDraftsSqliteTest
 */
import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/utility/ErrorHandler", () => ({__esModule: true, default: {postScheduledJobError: jest.fn()}}));

const mockGlobalContext = {isInitialised: () => true, db: null, beanRegistry: null};
jest.mock("../../../src/GlobalContext", () => ({__esModule: true, default: {getInstance: () => mockGlobalContext}}));

import {EntityMappingConfig} from "openchs-models";
import moment from "moment";
import SchemaGenerator from "../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../src/repository/RepositoryFactory";
import DraftSubjectService from "../../../src/service/draft/DraftSubjectService";
import DraftEncounterService from "../../../src/service/draft/DraftEncounterService";
import DraftEnrolmentService from "../../../src/service/draft/DraftEnrolmentService";
import DraftProgramEncounterService from "../../../src/service/draft/DraftProgramEncounterService";
import ErrorHandler from "../../../src/utility/ErrorHandler";
import DeleteDrafts from "../../../src/task/DeleteDrafts";
import {open} from "@op-engineering/op-sqlite";

const DRAFT_SCHEMAS = ["DraftSubject", "DraftEncounter", "DraftEnrolment", "DraftProgramEncounter"];

describe("DeleteDrafts on SQLite", () => {
    let rawDb, proxy;

    beforeEach(() => {
        rawDb = open({});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync("PRAGMA foreign_keys = OFF");
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        const repositoryFactory = new RepositoryFactory(proxy);
        const context = {getRepositoryFactory: () => repositoryFactory, getService: () => undefined};
        const services = {
            draftSubjectService: new DraftSubjectService(proxy, context),
            draftEncounterService: new DraftEncounterService(proxy, context),
            draftEnrolmentService: new DraftEnrolmentService(proxy, context),
            draftProgramEncounterService: new DraftProgramEncounterService(proxy, context),
        };
        mockGlobalContext.db = {objects: () => { throw new Error("DeleteDrafts read the Realm handle"); }};
        mockGlobalContext.beanRegistry = {getService: (name) => services[name]};
        ErrorHandler.postScheduledJobError.mockClear();
    });

    afterEach(() => rawDb && rawDb.close());

    const create = (schema, data) => proxy.write(() => proxy.create(schema, data, true, {skipHydration: true}));
    const daysAgo = (n) => moment().subtract(n, "days").toDate();
    const observations = [{concept: {uuid: "concept-1"}, valueJSON: JSON.stringify({answer: 12})}];
    const location = {x: 85.8, y: 20.3};
    const uuidsIn = (schema) => proxy.objects(schema).map(row => row.uuid).sort();

    function seedDrafts(prefix, updatedOn) {
        create("DraftSubject", {uuid: `${prefix}-subject`, subjectType: {uuid: "st"}, firstName: "A", registrationDate: updatedOn, observations, registrationLocation: location, updatedOn});
        create("DraftEncounter", {uuid: `${prefix}-encounter`, encounterType: {uuid: "et"}, individual: {uuid: "ind"}, observations, cancelObservations: observations, encounterLocation: location, voided: false, updatedOn});
        create("DraftEnrolment", {uuid: `${prefix}-enrolment`, program: {uuid: "pr"}, individual: {uuid: "ind"}, observations, programExitObservations: observations, enrolmentLocation: location, voided: false, updatedOn});
        create("DraftProgramEncounter", {uuid: `${prefix}-program-encounter`, encounterType: {uuid: "et"}, programEnrolment: {uuid: "enl"}, observations, cancelObservations: observations, encounterLocation: location, cancelLocation: location, voided: false, updatedOn});
    }

    it("deletes drafts older than 30 days of every type and keeps the recent ones", async () => {
        seedDrafts("old", daysAgo(31));
        seedDrafts("recent", daysAgo(2));
        DRAFT_SCHEMAS.forEach(schema => assert.lengthOf(uuidsIn(schema), 2, schema));

        await DeleteDrafts.execute();

        assert.deepEqual(ErrorHandler.postScheduledJobError.mock.calls, []);
        assert.deepEqual(uuidsIn("DraftSubject"), ["recent-subject"]);
        assert.deepEqual(uuidsIn("DraftEncounter"), ["recent-encounter"]);
        assert.deepEqual(uuidsIn("DraftEnrolment"), ["recent-enrolment"]);
        assert.deepEqual(uuidsIn("DraftProgramEncounter"), ["recent-program-encounter"]);
    });

    it("keeps the recent drafts' observations intact", async () => {
        seedDrafts("old", daysAgo(31));
        seedDrafts("recent", daysAgo(2));

        await DeleteDrafts.execute();

        const recent = proxy.objectForPrimaryKey("DraftProgramEncounter", "recent-program-encounter");
        assert.lengthOf(recent.observations, 1);
        assert.equal(recent.observations[0].concept.uuid, "concept-1");
    });
});
