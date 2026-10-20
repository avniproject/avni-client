const Database = require("better-sqlite3");
const {diffTable, formatDiff, isClean, timings} = require("../../../scripts/sync-row-diff");

// Shaped like the app's tables: the address is a declared link, created_by_uuid is plain text.
const subjects = (rows) => {
    const db = new Database(":memory:");
    // better-sqlite3 enforces foreign keys by default, and these rows point at parents that are not here.
    db.pragma("foreign_keys = OFF");
    db.exec(`CREATE TABLE address_level (uuid TEXT PRIMARY KEY);
        CREATE TABLE individual (uuid TEXT PRIMARY KEY, name TEXT, created_by_uuid TEXT, lowest_address_level_uuid TEXT,
            FOREIGN KEY ("lowest_address_level_uuid") REFERENCES address_level("uuid"))`);
    const insert = db.prepare("INSERT INTO individual VALUES (?, ?, ?, ?)");
    rows.forEach((row) => insert.run(...row));
    return db;
};

describe("Comparing two phone databases", () => {
    it("finds nothing when the rows match", () => {
        const result = diffTable(subjects([["i-1", "Meera Rao", "u-1", "al-1"]]), subjects([["i-1", "Meera Rao", "u-1", "al-1"]]), "individual");

        expect(isClean(result)).toBe(true);
        expect(result.parentKept).toBe(0);
    });

    it("counts a row whose only difference is a kept parent link apart from any other difference", () => {
        const result = diffTable(
            subjects([["i-1", "Meera Rao", "u-1", null], ["i-2", "Asha", "u-1", "al-1"]]),
            subjects([["i-1", "Meera Rao", "u-1", "al-elsewhere"], ["i-2", "Asha K", "u-1", "al-1"]]),
            "individual");

        expect(result.parentKept).toBe(1);
        expect(result.differing).toEqual({name: 1});
        expect(isClean(result)).toBe(false);
    });

    it("counts a filled-in plain uuid column as a difference, never as a kept parent link", () => {
        const result = diffTable(subjects([["i-1", "Meera Rao", null, "al-1"]]), subjects([["i-1", "Meera Rao", "u-1", "al-1"]]), "individual");

        expect(result.parentKept).toBe(0);
        expect(result.differing).toEqual({created_by_uuid: 1});
        expect(isClean(result)).toBe(false);
    });

    it("counts rows missing from either copy", () => {
        const result = diffTable(subjects([["i-1", "A", null, null]]), subjects([["i-2", "B", null, null]]), "individual");

        expect(result).toMatchObject({missing: 1, extra: 1});
        expect(isClean(result)).toBe(false);
    });

    it("prints no value from either copy", () => {
        const line = formatDiff(diffTable(subjects([["i-1", "Meera Rao", "u-1", null]]), subjects([["i-1", "Meera Rao K", "u-1", "al-elsewhere"]]), "individual"));

        expect(line).toBe("individual: today 1, direct 1; missing 0, extra 0; parent kept 0; other differences: name 1, lowest_address_level_uuid 1");
        expect(line).not.toMatch(/Meera|al-elsewhere|i-1|u-1/);
    });

    it("reads the sync time and each kind's save time from the last full sync, not a later upload-only one", () => {
        const db = new Database(":memory:");
        db.exec("CREATE TABLE sync_telemetry (sync_status TEXT, sync_source TEXT, sync_start_time INTEGER, sync_end_time INTEGER, entity_status TEXT)");
        const insert = db.prepare("INSERT INTO sync_telemetry VALUES (?, ?, ?, ?, ?)");
        insert.run("complete", "manual", 0, 532000,
            JSON.stringify({pull: [{entity: "Individual", done: 1000, networkMs: 2100.5, persistMs: 900.2}, {entity: "News", done: 0}]}));
        insert.run("complete", "automatic-upload-only", 600000, 610000, JSON.stringify({pull: []}));

        expect(timings(db)).toEqual(["sync complete (manual), 532 s", "Individual: 1000 records; networkMs 2101, persistMs 900"]);
    });

    it("says so when the copy holds no completed full sync", () => {
        const db = new Database(":memory:");
        db.exec("CREATE TABLE sync_telemetry (sync_status TEXT, sync_source TEXT, sync_start_time INTEGER, sync_end_time INTEGER, entity_status TEXT)");

        expect(timings(db)).toEqual(["no completed full sync in this copy"]);
    });
});
