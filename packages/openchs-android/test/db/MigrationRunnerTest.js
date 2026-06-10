import MigrationRunner from "../../src/framework/db/MigrationRunner";

function createMockDb() {
    const insertedRows = [];

    return {
        executeSync: jest.fn((sql, params) => {
            if (sql.startsWith("CREATE TABLE")) {
                return {rows: []};
            }
            if (sql.startsWith("SELECT MAX")) {
                return {rows: insertedRows.length > 0
                    ? [{version: Math.max(...insertedRows.map(r => r[0]))}]
                    : [{version: null}]};
            }
            if (sql.startsWith("INSERT INTO schema_version")) {
                insertedRows.push(params);
                return {rows: []};
            }
            return {rows: []};
        }),
        _insertedRows: insertedRows,
    };
}

describe("MigrationRunner", () => {
    it("creates schema_version table on first run", () => {
        const db = createMockDb();
        const runner = new MigrationRunner(db);
        runner.runMigrations({entries: []}, {});
        expect(db.executeSync).toHaveBeenCalledWith(
            expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_version")
        );
    });

    it("runs all migrations on fresh install", () => {
        const db = createMockDb();
        const runner = new MigrationRunner(db);
        const journal = {
            entries: [
                {idx: 0, tag: "0000_initial", breakpoints: true},
                {idx: 1, tag: "0001_add_col", breakpoints: true},
            ],
        };
        const sqlFiles = {
            "0000_initial": "CREATE TABLE foo (id TEXT);\n--> statement-breakpoint\nCREATE TABLE bar (id TEXT);",
            "0001_add_col": "ALTER TABLE foo ADD COLUMN name TEXT;",
        };

        const result = runner.runMigrations(journal, sqlFiles);

        expect(result).toEqual({from: -1, to: 1});
        // Should execute: CREATE TABLE (version), SELECT MAX, CREATE TABLE foo, CREATE TABLE bar, INSERT version, ALTER TABLE, INSERT version
        const executeCalls = db.executeSync.mock.calls.map(c => c[0]);
        expect(executeCalls).toContainEqual("CREATE TABLE foo (id TEXT);");
        expect(executeCalls).toContainEqual("CREATE TABLE bar (id TEXT);");
        expect(executeCalls).toContainEqual("ALTER TABLE foo ADD COLUMN name TEXT;");
    });

    it("skips already-applied migrations", () => {
        const db = {
            executeSync: jest.fn((sql) => {
                if (sql.startsWith("CREATE TABLE")) return {rows: []};
                if (sql.startsWith("SELECT MAX")) return {rows: [{version: 0}]};
                return {rows: []};
            }),
        };
        const runner = new MigrationRunner(db);
        const journal = {
            entries: [
                {idx: 0, tag: "0000_initial", breakpoints: true},
                {idx: 1, tag: "0001_add_col", breakpoints: true},
            ],
        };
        const sqlFiles = {
            "0000_initial": "CREATE TABLE foo (id TEXT);",
            "0001_add_col": "ALTER TABLE foo ADD COLUMN name TEXT;",
        };

        const result = runner.runMigrations(journal, sqlFiles);

        expect(result).toEqual({from: 0, to: 1});
        const executeCalls = db.executeSync.mock.calls.map(c => c[0]);
        expect(executeCalls).not.toContainEqual("CREATE TABLE foo (id TEXT);");
        expect(executeCalls).toContainEqual("ALTER TABLE foo ADD COLUMN name TEXT;");
    });

    it("splits SQL on statement-breakpoint when breakpoints is true", () => {
        const db = createMockDb();
        const runner = new MigrationRunner(db);
        const journal = {entries: [{idx: 0, tag: "0000_test", breakpoints: true}]};
        const sqlFiles = {
            "0000_test": "STMT1;\n--> statement-breakpoint\nSTMT2;",
        };

        runner.runMigrations(journal, sqlFiles);

        const executeCalls = db.executeSync.mock.calls.map(c => c[0]);
        expect(executeCalls).toContainEqual("STMT1;");
        expect(executeCalls).toContainEqual("STMT2;");
    });

    it("does not split SQL when breakpoints is false", () => {
        const db = createMockDb();
        const runner = new MigrationRunner(db);
        const journal = {entries: [{idx: 0, tag: "0000_test", breakpoints: false}]};
        const sqlFiles = {
            "0000_test": "STMT1;\n--> statement-breakpoint\nSTMT2;",
        };

        runner.runMigrations(journal, sqlFiles);

        const executeCalls = db.executeSync.mock.calls.map(c => c[0]);
        expect(executeCalls).toContainEqual("STMT1;\n--> statement-breakpoint\nSTMT2;");
    });

    it("returns same version when no pending migrations", () => {
        const db = {
            executeSync: jest.fn((sql) => {
                if (sql.startsWith("CREATE TABLE")) return {rows: []};
                if (sql.startsWith("SELECT MAX")) return {rows: [{version: 1}]};
                return {rows: []};
            }),
        };
        const runner = new MigrationRunner(db);
        const result = runner.runMigrations(
            {entries: [{idx: 0, tag: "0000_initial"}, {idx: 1, tag: "0001_add"}]},
            {}
        );

        expect(result).toEqual({from: 1, to: 1});
    });

    it("throws when SQL file is missing for a migration", () => {
        const db = createMockDb();
        const runner = new MigrationRunner(db);
        const journal = {entries: [{idx: 0, tag: "0000_missing", breakpoints: true}]};

        expect(() => runner.runMigrations(journal, {})).toThrow("Migration SQL not found for tag: 0000_missing");
    });

    it("propagates SQL execution errors", () => {
        const db = {
            executeSync: jest.fn((sql) => {
                if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) return {rows: []};
                if (sql.startsWith("SELECT MAX")) return {rows: [{version: null}]};
                if (sql.startsWith("BAD SQL")) throw new Error("SQL error");
                return {rows: []};
            }),
        };
        const runner = new MigrationRunner(db);
        const journal = {entries: [{idx: 0, tag: "0000_bad", breakpoints: false}]};

        expect(() => runner.runMigrations(journal, {"0000_bad": "BAD SQL"})).toThrow("SQL error");
    });

    it("records tag in schema_version", () => {
        const db = createMockDb();
        const runner = new MigrationRunner(db);
        const journal = {entries: [{idx: 0, tag: "0000_initial", breakpoints: true}]};
        const sqlFiles = {"0000_initial": "CREATE TABLE t (id TEXT);"};

        runner.runMigrations(journal, sqlFiles);

        expect(db._insertedRows[0][0]).toBe(0);
        expect(db._insertedRows[0][1]).toBe("0000_initial");
    });
});
