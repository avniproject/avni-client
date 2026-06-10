jest.mock("react-native-randombytes", () => ({randomBytes: jest.fn()}));
jest.mock("react-native-keychain", () => ({getGenericPassword: jest.fn(), setGenericPassword: jest.fn()}));
jest.mock("base-64", () => ({encode: jest.fn(), decode: jest.fn()}));

import SqliteFactory from "../../src/framework/db/SqliteFactory";

describe("SqliteFactory", () => {
    describe("_seedSettings", () => {
        it("inserts Settings row when table is empty", () => {
            const db = {
                executeSync: jest.fn((sql) => {
                    if (sql.includes("SELECT")) return {rows: []};
                    return {rows: []};
                }),
            };

            SqliteFactory._seedSettings(db);

            expect(db.executeSync).toHaveBeenCalledTimes(2);
            const insertCall = db.executeSync.mock.calls[1];
            expect(insertCall[0]).toContain("INSERT INTO settings");
            expect(insertCall[1][0]).toBe("2aa81079-38c3-4d9f-8380-f50544b32b3d");
        });

        it("skips insert when Settings row already exists", () => {
            const db = {
                executeSync: jest.fn((sql) => {
                    if (sql.includes("SELECT")) return {rows: [{uuid: "existing"}]};
                    return {rows: []};
                }),
            };

            SqliteFactory._seedSettings(db);

            expect(db.executeSync).toHaveBeenCalledTimes(1); // only the SELECT
        });
    });

    describe("seedUserInfo", () => {
        it("inserts UserInfo row when user does not exist", () => {
            const db = {
                executeSync: jest.fn((sql) => {
                    if (sql.includes("SELECT")) return {rows: []};
                    return {rows: []};
                }),
            };

            SqliteFactory.seedUserInfo(db, {
                uuid: "user-123",
                username: "testuser",
                organisationUUID: "org-456",
                settings: {locale: "en"},
                syncSettings: {syncAllAddressLevels: true},
                name: "Test User",
            });

            expect(db.executeSync).toHaveBeenCalledTimes(2);
            const insertCall = db.executeSync.mock.calls[1];
            expect(insertCall[0]).toContain("INSERT INTO user_info");
            expect(insertCall[1][0]).toBe("user-123");
            expect(insertCall[1][1]).toBe("testuser");
            expect(insertCall[1][2]).toBe("org-456");
            expect(insertCall[1][3]).toBe('{"locale":"en"}');
            expect(insertCall[1][4]).toBe('{"syncAllAddressLevels":true}');
            expect(insertCall[1][5]).toBe("Test User");
        });

        it("skips insert when user already exists", () => {
            const db = {
                executeSync: jest.fn((sql) => {
                    if (sql.includes("SELECT")) return {rows: [{uuid: "user-123"}]};
                    return {rows: []};
                }),
            };

            SqliteFactory.seedUserInfo(db, {uuid: "user-123", username: "testuser"});

            expect(db.executeSync).toHaveBeenCalledTimes(1); // only the SELECT
        });

        it("handles string settings without double-encoding", () => {
            const db = {
                executeSync: jest.fn((sql) => {
                    if (sql.includes("SELECT")) return {rows: []};
                    return {rows: []};
                }),
            };

            SqliteFactory.seedUserInfo(db, {
                uuid: "user-123",
                settings: '{"locale":"en"}',
                syncSettings: '{"sync":true}',
            });

            const insertCall = db.executeSync.mock.calls[1];
            expect(insertCall[1][3]).toBe('{"locale":"en"}');
            expect(insertCall[1][4]).toBe('{"sync":true}');
        });

        it("handles missing optional fields", () => {
            const db = {
                executeSync: jest.fn((sql) => {
                    if (sql.includes("SELECT")) return {rows: []};
                    return {rows: []};
                }),
            };

            SqliteFactory.seedUserInfo(db, {uuid: "user-123"});

            const insertCall = db.executeSync.mock.calls[1];
            expect(insertCall[1][1]).toBe(""); // username
            expect(insertCall[1][2]).toBe(""); // organisationUUID
            expect(insertCall[1][5]).toBe(""); // name
        });
    });

    describe("getDbPath", () => {
        it("returns the database filename", () => {
            expect(SqliteFactory.getDbPath()).toBe("avni_sqlite.db");
        });
    });
});
