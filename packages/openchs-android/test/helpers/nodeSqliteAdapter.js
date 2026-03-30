/**
 * Node.js adapter that wraps better-sqlite3 to match op-sqlite's interface.
 *
 * op-sqlite API (used by SqliteProxy):
 *   db.executeSync(sql, params?) → { rows: [{col: val, ...}, ...] }
 *   db.close()
 *
 * better-sqlite3 API:
 *   db.prepare(sql).all(...params) → [{col: val, ...}, ...]
 *   db.prepare(sql).run(...params) → { changes, lastInsertRowid }
 *   db.close()
 */
const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');
const fs = require('fs');

function open(options = {}) {
    const dbPath = options.name
        ? path.join(os.tmpdir(), options.name)
        : ':memory:';

    // Clean up any existing file for fresh tests
    if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    return {
        _db: db,
        _path: dbPath,

        executeSync(sql, params = []) {
            const trimmed = sql.trim();
            const isSelect = /^SELECT\b/i.test(trimmed)
                || /^PRAGMA\s+table_info/i.test(trimmed)
                || /^PRAGMA\s+index_list/i.test(trimmed);

            if (isSelect) {
                const rows = db.prepare(trimmed).all(...params);
                return {rows};
            } else {
                db.prepare(trimmed).run(...params);
                return {rows: []};
            }
        },

        execute(sql, params = []) {
            return Promise.resolve(this.executeSync(sql, params));
        },

        close() {
            db.close();
            if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
                try { fs.unlinkSync(dbPath); } catch (_) {}
            }
        },
    };
}

module.exports = {open};
