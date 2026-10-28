const fs = require("fs");
const os = require("os");
const path = require("path");
const {spawnSync} = require("child_process");
const Database = require("better-sqlite3");
const {TABLES, diffTable, formatDiff, isClean, timings} = require("../../../scripts/sync-row-diff");

// Shaped like the app's tables: the address is a declared parent link, created_by_uuid is plain text, and the latest
// approval status is a declared link too, but one both paths fill in themselves.
const subjects = (rows) => {
    const db = new Database(":memory:");
    // better-sqlite3 enforces foreign keys by default, and these rows point at parents that are not here.
    db.pragma("foreign_keys = OFF");
    db.exec(`CREATE TABLE address_level (uuid TEXT PRIMARY KEY);
        CREATE TABLE entity_approval_status (uuid TEXT PRIMARY KEY);
        CREATE TABLE individual (uuid TEXT PRIMARY KEY, name TEXT, created_by_uuid TEXT, lowest_address_level_uuid TEXT,
            latest_entity_approval_status_uuid TEXT,
            FOREIGN KEY ("lowest_address_level_uuid") REFERENCES address_level("uuid"),
            FOREIGN KEY ("latest_entity_approval_status_uuid") REFERENCES entity_approval_status("uuid"))`);
    const insert = db.prepare("INSERT INTO individual VALUES (?, ?, ?, ?, ?)");
    // A row is [uuid, name, created_by_uuid, lowest_address_level_uuid] and may end with latest_entity_approval_status_uuid.
    rows.forEach(([uuid, name, createdBy, address, approval = null]) => insert.run(uuid, name, createdBy, address, approval));
    return db;
};

// A row is [sync_status, sync_source, sync_start_time, sync_end_time, entity_status].
const telemetry = (rows) => {
    const db = new Database(":memory:");
    db.exec("CREATE TABLE sync_telemetry (sync_status TEXT, sync_source TEXT, sync_start_time INTEGER, sync_end_time INTEGER, entity_status TEXT)");
    const insert = db.prepare("INSERT INTO sync_telemetry VALUES (?, ?, ?, ?, ?)");
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

    it("is clean when the only differences are kept parent links", () => {
        const result = diffTable(subjects([["i-1", "Meera Rao", "u-1", null]]), subjects([["i-1", "Meera Rao", "u-1", "al-elsewhere"]]), "individual");

        expect(result.parentKept).toBe(1);
        expect(result.differing).toEqual({});
        expect(isClean(result)).toBe(true);
    });

    it("counts a filled-in link whose parent is in the direct copy as a difference, never as a kept parent link", () => {
        // A parent on the phone means today's path left out a link it could have written: not a parent outside the catchment.
        const direct = subjects([["i-1", "Meera Rao", "u-1", "al-1"]]);
        direct.prepare("INSERT INTO address_level VALUES (?)").run("al-1");
        const result = diffTable(subjects([["i-1", "Meera Rao", "u-1", null]]), direct, "individual");

        expect(result.parentKept).toBe(0);
        expect(result.differing).toEqual({lowest_address_level_uuid: 1});
        expect(isClean(result)).toBe(false);
    });

    it("names the parent table, and no value, when it cannot check a kept link's parent", () => {
        const direct = subjects([["i-1", "Meera Rao", "u-1", "al-elsewhere"]]);
        direct.exec("DROP TABLE address_level");

        expect(() => diffTable(subjects([["i-1", "Meera Rao", "u-1", null]]), direct, "individual"))
            .toThrow(/^address_level: not readable in direct copy$/);
    });

    it("counts a filled-in plain uuid column as a difference, never as a kept parent link", () => {
        const result = diffTable(subjects([["i-1", "Meera Rao", null, "al-1"]]), subjects([["i-1", "Meera Rao", "u-1", "al-1"]]), "individual");

        expect(result.parentKept).toBe(0);
        expect(result.differing).toEqual({created_by_uuid: 1});
        expect(isClean(result)).toBe(false);
    });

    it("counts a link that changes from one value to another as a difference, never as a kept parent link", () => {
        const result = diffTable(subjects([["i-1", "Meera Rao", "u-1", "al-1"]]), subjects([["i-1", "Meera Rao", "u-1", "al-2"]]), "individual");

        expect(result.parentKept).toBe(0);
        expect(result.differing).toEqual({lowest_address_level_uuid: 1});
        expect(isClean(result)).toBe(false);
    });

    it("counts a filled-in latest approval link as a difference, never as a kept parent link", () => {
        // Both paths work this link out after the save, so it is not a parent the new path keeps.
        const result = diffTable(subjects([["i-1", "Meera Rao", "u-1", "al-1", null]]), subjects([["i-1", "Meera Rao", "u-1", "al-1", "ap-1"]]), "individual");

        expect(result.parentKept).toBe(0);
        expect(result.differing).toEqual({latest_entity_approval_status_uuid: 1});
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
        const db = telemetry([
            ["complete", "manual", 0, 532000,
                JSON.stringify({pull: [{entity: "Individual", done: 1000, networkMs: 2100.5, persistMs: 900.2}, {entity: "News", done: 0}]})],
            ["complete", "automatic-upload-only", 600000, 610000, JSON.stringify({pull: []})]]);

        expect(timings(db)).toEqual(["sync complete (manual), 532 s", "Individual: 1000 records; networkMs 2101, persistMs 900"]);
    });

    it("reads the latest of several full syncs, whatever order they were written in", () => {
        const pulled = (done) => JSON.stringify({pull: [{entity: "Individual", done, persistMs: done}]});
        // The latest start is neither the first row written nor the last, so neither can pass by accident.
        const db = telemetry([
            ["complete", "manual", 0, 532000, pulled(1000)],
            ["complete", "automatic", 900000, 1000000, pulled(5)],
            ["complete", "manual", 300000, 400000, pulled(70)]]);

        expect(timings(db)).toEqual(["sync complete (automatic), 100 s", "Individual: 5 records; persistMs 5"]);
    });

    it("says so when the copy holds no completed full sync", () => {
        const db = telemetry([]);

        expect(timings(db)).toEqual(["no completed full sync in this copy"]);
    });

    it.each([
        ["not valid JSON", "SENTINEL-CELL-TEXT is not json"],
        ["empty", null],
        ["missing its list of pulled kinds", JSON.stringify({push: []})],
    ])("says only that the per-kind times are not readable, quoting none of the cell, when the cell is %s", (_, cell) => {
        const lines = timings(telemetry([["complete", "manual", 0, 532000, cell]]));

        expect(lines).toEqual(["sync complete (manual), 532 s; per-kind times not readable in this copy"]);
        expect(lines.join("\n")).not.toContain("SENTINEL");
    });
});

describe("The command line", () => {
    const script = require.resolve("../../../scripts/sync-row-diff");
    let dir;

    beforeAll(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-row-diff-"));
    });

    afterAll(() => {
        fs.rmSync(dir, {recursive: true, force: true});
    });

    // A copy on disk with every table `rows` reads, each holding a uuid and a note. `notes` puts one row in a table; `without` leaves a table out.
    const copy = (name, {notes = {}, without} = {}) => {
        const file = path.join(dir, name);
        const db = new Database(file);
        TABLES.filter((table) => table !== without).forEach((table) => {
            db.exec(`CREATE TABLE ${table} (uuid TEXT PRIMARY KEY, note TEXT)`);
            if (notes[table]) db.prepare(`INSERT INTO ${table} VALUES ('u-1', ?)`).run(notes[table]);
        });
        db.close();
        return file;
    };

    const run = (...args) => {
        const {status, stdout, stderr} = spawnSync(process.execPath, [script, ...args], {encoding: "utf8"});
        return {status, stdout, stderr, lines: stdout.split("\n").filter((line) => line !== "")};
    };

    it("exits 0 when the copies match, 1 when a table differs and 2 when a table cannot be read", () => {
        const today = copy("today.db", {notes: {individual: "Meera Rao"}});
        const same = copy("same.db", {notes: {individual: "Meera Rao"}});
        const differing = copy("differing.db", {notes: {individual: "Meera Rao K"}});
        const withoutEncounter = copy("without-encounter.db", {notes: {individual: "Meera Rao"}, without: "encounter"});

        expect(run("rows", today, same).status).toBe(0);
        expect(run("rows", today, differing).status).toBe(1);

        const unreadableDirect = run("rows", today, withoutEncounter);
        expect(unreadableDirect.status).toBe(2);
        expect(unreadableDirect.lines).toHaveLength(TABLES.length);
        expect(unreadableDirect.lines).toContain("encounter: not readable in direct copy");
        // The other seven tables are still compared and printed.
        expect(unreadableDirect.lines.filter((line) => line.includes(": today "))).toHaveLength(TABLES.length - 1);

        const unreadableToday = run("rows", withoutEncounter, today);
        expect(unreadableToday.status).toBe(2);
        expect(unreadableToday.lines).toContain("encounter: not readable in today copy");
    });

    it("exits 2, never 1, when anything cannot be read, and prints no value from either copy", () => {
        const today = copy("a.db", {notes: {individual: "Meera Rao", encounter: "Asha"}});
        // Differs in a table before the unreadable one and in a table after it, so neither order can pass by accident.
        const differingWithoutEnrolment = copy("b.db", {notes: {individual: "SENTINEL-NOTE", encounter: "SENTINEL-OTHER"}, without: "program_enrolment"});
        const missing = path.join(dir, "missing.db");

        // A table that cannot be read outranks a table that differs.
        const both = run("rows", today, differingWithoutEnrolment);
        expect(both.status).toBe(2);
        expect(both.lines).toContain("individual: today 1, direct 1; missing 0, extra 0; parent kept 0; other differences: note 1");
        expect(both.lines).toContain("program_enrolment: not readable in direct copy");
        expect(both.lines).toContain("encounter: today 1, direct 1; missing 0, extra 0; parent kept 0; other differences: note 1");

        const unopened = run("rows", today, missing);
        expect(unopened.status).toBe(2);
        expect(unopened.lines).toEqual(["direct copy: cannot be opened"]);
        expect(fs.existsSync(missing)).toBe(false);

        // These copies hold no sync_telemetry table.
        const noTelemetry = run("timings", today);
        expect(noTelemetry.status).toBe(2);
        expect(noTelemetry.lines).toEqual(["sync_telemetry: not readable in this copy"]);
        const unopenedTimings = run("timings", missing);
        expect(unopenedTimings.status).toBe(2);
        expect(unopenedTimings.lines).toEqual(["copy: cannot be opened"]);

        expect(run("rows", today).status).toBe(2);
        expect(run().status).toBe(2);

        [both, unopened, noTelemetry, unopenedTimings].forEach((result) => {
            expect(result.stdout + result.stderr).not.toMatch(/Meera|Asha|SENTINEL|u-1/);
        });
    });
});
