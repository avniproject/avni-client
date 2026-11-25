import {open} from "@op-engineering/op-sqlite";
import MigrationRunner from "../../../../src/framework/db/MigrationRunner";
import {journal, sqlFiles} from "../../../../src/framework/db/migrations/drizzleMigrations";

const TAG = "0009_report_card_action_detail_dashboard_uuid";
const IDX = journal.entries.find(e => e.tag === TAG).idx;
const upTo = (idx) => ({entries: journal.entries.filter(e => e.idx <= idx)});
const columns = (db) => db.executeSync("PRAGMA table_info(report_card)").rows.map(r => r.name);
const recordedVersions = (db) => db.executeSync("SELECT version FROM schema_version").rows.map(r => r.version);
const loadedSince = (db, name) => db.executeSync(
    "SELECT loaded_since FROM entity_sync_status WHERE entity_name = ?", [name]).rows[0].loaded_since;
const addSyncRow = (db, uuid, name) => db.executeSync(
    "INSERT INTO entity_sync_status (uuid, entity_name, loaded_since, entity_type_uuid) VALUES (?, ?, 1730000000000, '')", [uuid, name]);

let db;

beforeEach(() => {
    db = open({});
});

afterEach(() => db && db.close());

it("adds the target dashboard column on a fresh install", () => {
    new MigrationRunner(db).runMigrations(journal, sqlFiles);
    expect(columns(db)).toContain("action_detail_dashboard_uuid");
    expect(recordedVersions(db)).toContain(IDX);
});

it("moves only the ReportCard sync marker back to 1900-01-01 on an upgrade", () => {
    const runner = new MigrationRunner(db);
    runner.runMigrations(upTo(8), sqlFiles);
    addSyncRow(db, "s1", "ReportCard");
    addSyncRow(db, "s2", "Dashboard");
    runner.runMigrations(journal, sqlFiles);
    expect(loadedSince(db, "ReportCard")).toBe(-2208988800000);
    expect(loadedSince(db, "Dashboard")).toBe(1730000000000);
});

it("completes on retry after stopping between the reset and the column", () => {
    const runner = new MigrationRunner(db);
    runner.runMigrations(upTo(8), sqlFiles);
    db.executeSync(sqlFiles[TAG].split("--> statement-breakpoint")[0].trim());
    expect(() => runner.runMigrations(journal, sqlFiles)).not.toThrow();
    expect(columns(db)).toContain("action_detail_dashboard_uuid");
    expect(recordedVersions(db)).toContain(IDX);
});
