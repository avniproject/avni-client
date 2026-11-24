const mockSizes = {};
jest.mock("react-native-fs", () => ({
    DocumentDirectoryPath: "/docs",
    exists: jest.fn(async (path) => path in mockSizes),
    stat: jest.fn(async (path) => {
        if (!(path in mockSizes)) throw new Error(`ENOENT ${path}`);
        return {size: mockSizes[path]};
    }),
}));
jest.mock("react-native-device-info", () => ({}));
jest.mock("@op-engineering/op-sqlite", () => ({open: jest.fn()}));
jest.mock("../../src/service/SettingsService", () => class SettingsService {});
jest.mock("../../src/framework/db/SqliteFactory", () => ({getDbFullPath: () => "/docs/avni_sqlite.db"}));

import MetricsService from "../../src/service/MetricsService";
import GlobalContext from "../../src/GlobalContext";

const setSizes = (sizes) => {
    Object.keys(mockSizes).forEach(k => delete mockSizes[k]);
    Object.assign(mockSizes, sizes);
};

const serviceOn = (db, backend) => {
    jest.spyOn(GlobalContext, "getInstance").mockReturnValue({getActiveBackend: () => backend});
    const service = new MetricsService(db, {});
    service.getService = () => ({getSettings: () => ({pageSize: 100})});
    return service;
};

describe("MetricsService", () => {
    afterEach(() => jest.restoreAllMocks());

    describe("getAppInfo, read as a sync starts", () => {
        it("on SQLite, reports the SQLite file and its write-ahead log, not the leftover Realm file", async () => {
            setSizes({"/docs/default.realm": 999, "/docs/avni_sqlite.db": 4096, "/docs/avni_sqlite.db-wal": 1024});

            const appInfo = await serviceOn({isSqlite: true}, "sqlite").getAppInfo();

            expect(appInfo).toMatchObject({dbSize: 5120, activeBackend: "sqlite"});
        });

        it("on SQLite, reads no observations before the sync, leaving the counts for its end", async () => {
            setSizes({"/docs/avni_sqlite.db": 4096});
            const db = {isSqlite: true, execCountObservationsAndPoints: jest.fn()};

            const appInfo = await serviceOn(db, "sqlite").getAppInfo();

            expect(db.execCountObservationsAndPoints).not.toHaveBeenCalled();
            expect(appInfo).toMatchObject({observationCount: null, pointCount: null});
        });

        it("on Realm, keeps reporting the Realm file and its row counts", async () => {
            setSizes({"/docs/default.realm": 999, "/docs/avni_sqlite.db": 4096});
            const service = serviceOn({}, "realm");
            service.getCount = (name) => ({Observation: 7, Point: 2})[name];

            const appInfo = await service.getAppInfo();

            expect(appInfo).toMatchObject({dbSize: 999, observationCount: 7, pointCount: 2, activeBackend: "realm"});
        });
    });

});
