/**
 * Saving a dashboard card's count replaces the one saved for it before, on the newer phone database. The cache's
 * counts sit in a list inside one CustomDashboardCache row, and SQLite saves an edited row whole, so a removal that
 * changes only a copy of the list leaves the old count on disk. Real SQLite, real CustomDashboardCacheService, real
 * repository; the row is read back from the database after each save.
 *
 *   npx jest --selectProjects integration --testPathPattern DashboardCacheSaveResultsTest
 */
jest.mock("../../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../../../src/store/AppStore", () => ({__esModule: true, default: {}}));
jest.mock("../../../../src/framework/db/RealmFactory", () => ({__esModule: true, default: {}}));

import {assert} from "chai";
import {open} from "@op-engineering/op-sqlite";
import {CustomDashboardCache, EntityMappingConfig, ReportCard, ReportCardResult} from "openchs-models";
import {SchemaGenerator} from "../../../../src/framework/db/SchemaGenerator";
import SqliteProxy from "../../../../src/framework/db/SqliteProxy";
import RepositoryFactory from "../../../../src/repository/RepositoryFactory";
import CustomDashboardCacheService from "../../../../src/service/CustomDashboardCacheService";

const DASHBOARD = "d-1";

function card(uuid) {
    const reportCard = ReportCard.newReportCard();
    reportCard.uuid = uuid;
    return reportCard;
}

const A = card("card-a");
const B = card("card-b");

const savedCount = (uuid, reportCard, primaryValue) => ({uuid, dashboard: DASHBOARD, reportCard, primaryValue, secondaryValue: ""});
const count = (primaryValue) => ReportCardResult.create(primaryValue, null, true);

// A phone on the newer database holding one dashboard whose cache has counts for A and B.
function phone(singleCounts) {
    const rawDb = open({});
    const cfg = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(cfg);
    rawDb.executeSync("PRAGMA foreign_keys = OFF");
    for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
    const proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, SchemaGenerator.buildRealmSchemaMap(cfg));
    const repositoryFactory = new RepositoryFactory(proxy);
    const service = new CustomDashboardCacheService(proxy, {getRepositoryFactory: () => repositoryFactory, getService: () => undefined});

    proxy.write(() => {
        proxy.create("Dashboard", {uuid: DASHBOARD, name: "Home", voided: false}, true, {skipHydration: true});
        proxy.create("CustomDashboardCache", {
            uuid: "cache-1",
            dashboard: {uuid: DASHBOARD},
            selectedValuesJSON: "{}",
            filterApplied: false,
            dashboardFiltersHash: "",
            reportCardResults: singleCounts,
            nestedReportCardResults: [],
        }, true, {skipHydration: true});
    });

    // The cache row as a fresh read from the database gives it, as [card, value] pairs. Array.from, because a map over
    // the list proxy builds another proxy with no stored list behind it.
    const savedCounts = () => {
        const row = proxy.objects("CustomDashboardCache").filtered("uuid = $0", "cache-1")[0];
        return Array.from(new CustomDashboardCache(row).reportCardResults, (x) => [x.reportCard, x.primaryValue]);
    };
    return {service, savedCounts, proxy};
}

describe("CustomDashboardCacheService on SQLite, saving a card's count", () => {
    it("starts from the counts the row was saved with", () => {
        const {savedCounts} = phone([savedCount("r-1", A.uuid, "7"), savedCount("r-2", B.uuid, "5")]);

        assert.deepEqual(savedCounts(), [[A.uuid, "7"], [B.uuid, "5"]]);
    });

    it("batchUpdateResults replaces the count saved for the card before", () => {
        const {service, savedCounts} = phone([savedCount("r-1", A.uuid, "7"), savedCount("r-2", B.uuid, "5")]);

        service.batchUpdateResults(DASHBOARD, [{card: A, result: count("8")}], []);

        assert.sameDeepMembers(savedCounts(), [[A.uuid, "8"], [B.uuid, "5"]]);
    });

    it("updateReportCardResult replaces the count saved for the card before and leaves every other card's", () => {
        const {service, savedCounts} = phone([savedCount("r-1", A.uuid, "7"), savedCount("r-2", B.uuid, "5")]);

        service.updateReportCardResult(DASHBOARD, A, count("8"));

        assert.sameDeepMembers(savedCounts(), [[A.uuid, "8"], [B.uuid, "5"]]);
    });

    it("a card saved twice by an earlier build ends with one count", () => {
        const {service, savedCounts} = phone([savedCount("r-1", A.uuid, "7"), savedCount("r-3", A.uuid, "6"), savedCount("r-2", B.uuid, "5")]);

        service.batchUpdateResults(DASHBOARD, [{card: A, result: count("8")}], []);

        assert.sameDeepMembers(savedCounts(), [[A.uuid, "8"], [B.uuid, "5"]]);
    });

    it("in a refresh's own order, each card saved on its own with the query cache on, then the batch with a dropped card, ends with one count per card", () => {
        const C = card("card-c");
        const {service, savedCounts, proxy} = phone([savedCount("r-1", A.uuid, "7"), savedCount("r-2", B.uuid, "5"), savedCount("r-3", C.uuid, "2")]);
        const a = count("8");
        const b = count("6");

        proxy.beginQueryCache();
        service.updateReportCardResult(DASHBOARD, A, a);
        service.updateReportCardResult(DASHBOARD, B, b);
        proxy.endQueryCache();
        service.batchUpdateResults(DASHBOARD, [{card: A, result: a}, {card: B, result: b}, {card: C, result: null}], []);

        assert.sameDeepMembers(savedCounts(), [[A.uuid, "8"], [B.uuid, "6"]]);
    });

    it("batchUpdateResults given no result for a card drops its saved count and saves none", () => {
        const {service, savedCounts} = phone([savedCount("r-1", A.uuid, "7"), savedCount("r-2", B.uuid, "5")]);

        service.batchUpdateResults(DASHBOARD, [{card: A, result: null}], []);

        assert.deepEqual(savedCounts(), [[B.uuid, "5"]]);
    });
});
