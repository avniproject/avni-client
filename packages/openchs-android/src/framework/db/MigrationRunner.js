import General from "../../utility/General";

class MigrationRunner {
    constructor(db) {
        this.db = db;
    }

    ensureVersionTable() {
        this.db.executeSync(
            "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL, applied_at INTEGER NOT NULL, tag TEXT)"
        );
    }

    getCurrentVersion() {
        const result = this.db.executeSync("SELECT MAX(version) as version FROM schema_version");
        if (result.rows && result.rows.length > 0 && result.rows[0].version != null) {
            return result.rows[0].version;
        }
        return -1;
    }

    setVersion(version, tag) {
        this.db.executeSync(
            "INSERT INTO schema_version (version, tag, applied_at) VALUES (?, ?, ?)",
            [version, tag || "", Date.now()]
        );
    }

    /**
     * Run migrations from drizzle-kit generated SQL files.
     *
     * @param {Object} journal - Parsed _journal.json: { entries: [{ idx, tag, breakpoints }] }
     * @param {Object} sqlFiles - Map of tag → SQL string content: { "0000_initial": "CREATE TABLE..." }
     * @returns {{ from: number, to: number }}
     */
    runMigrations(journal, sqlFiles) {
        this.ensureVersionTable();
        const currentVersion = this.getCurrentVersion();
        const entries = journal.entries || [];
        const pending = entries
            .filter(e => e.idx > currentVersion)
            .sort((a, b) => a.idx - b.idx);

        for (const entry of pending) {
            const sql = sqlFiles[entry.tag];
            if (!sql) {
                throw new Error(`Migration SQL not found for tag: ${entry.tag}`);
            }

            General.logInfo("MigrationRunner", `Running migration ${entry.tag} (idx ${entry.idx})`);

            const statements = entry.breakpoints
                ? sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean)
                : [sql.trim()];

            for (const stmt of statements) {
                if (stmt) {
                    this.db.executeSync(stmt);
                }
            }

            this.setVersion(entry.idx, entry.tag);
            General.logInfo("MigrationRunner", `Migration ${entry.tag} applied`);
        }

        const toVersion = pending.length > 0 ? pending[pending.length - 1].idx : currentVersion;
        General.logInfo("MigrationRunner", `Migrations complete: idx ${currentVersion} → ${toVersion}`);
        return {from: currentVersion, to: toVersion};
    }
}

export default MigrationRunner;
