/**
 * Compares two copies of the phone's database after the same first sync, one saved by today's path and
 * one by rows built straight from the download (#2145), and reads the per-kind save times a sync
 * recorded. Prints table names, column names and counts only, never a value: a copy may hold records
 * from a production clone. Opens the copies read-write, so a pulled -wal file is applied; run it on
 * copies only.
 *
 *   node scripts/sync-row-diff.js rows <today.db> <direct.db>
 *   node scripts/sync-row-diff.js timings <copy.db>
 */
const Database = require('better-sqlite3');

const TABLES = ['individual', 'program_enrolment', 'program_encounter', 'encounter',
    'individual_relationship', 'checklist', 'checklist_item', 'entity_approval_status'];

function diffTable(today, direct, table) {
    const columns = today.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
    // Only declared links count as parent links: created_by_uuid, filled_by_uuid, entity_uuid and the like are plain text.
    const links = new Set(today.prepare(`PRAGMA foreign_key_list(${table})`).all().map((fk) => fk.from));
    const byUuid = (db) => new Map(db.prepare(`SELECT * FROM ${table}`).all().map((row) => [row.uuid, row]));
    const todayRows = byUuid(today);
    const directRows = byUuid(direct);
    const result = {table, today: todayRows.size, direct: directRows.size, missing: 0, extra: 0, parentKept: 0, differing: {}};
    todayRows.forEach((todayRow, uuid) => {
        const directRow = directRows.get(uuid);
        if (!directRow) {
            result.missing++;
            return;
        }
        const changed = columns.filter((column) => todayRow[column] !== directRow[column]);
        if (changed.length === 0) return;
        // The one intended difference: today's path leaves a missing parent's link empty, the new path keeps its uuid.
        if (changed.every((column) => links.has(column) && todayRow[column] === null && directRow[column] !== null)) {
            result.parentKept++;
            return;
        }
        changed.forEach((column) => {
            result.differing[column] = (result.differing[column] || 0) + 1;
        });
    });
    directRows.forEach((row, uuid) => {
        if (!todayRows.has(uuid)) result.extra++;
    });
    return result;
}

function formatDiff(result) {
    const differing = Object.entries(result.differing).map(([column, count]) => `${column} ${count}`).join(', ') || 'none';
    return `${result.table}: today ${result.today}, direct ${result.direct}; missing ${result.missing}, extra ${result.extra}; ` +
        `parent kept ${result.parentKept}; other differences: ${differing}`;
}

function isClean(result) {
    return result.today === result.direct && result.missing === 0 && result.extra === 0 && Object.keys(result.differing).length === 0;
}

function timings(db) {
    // The last full sync: a background upload-only sync writes a newer row that pulled nothing (SyncService.syncSources).
    const sync = db.prepare(`SELECT sync_status, sync_source, sync_start_time, sync_end_time, entity_status FROM sync_telemetry
        WHERE sync_status = 'complete' AND (sync_source IS NULL OR sync_source != 'automatic-upload-only')
        ORDER BY sync_start_time DESC LIMIT 1`).get();
    if (!sync) return ['no completed full sync in this copy'];
    const lines = [`sync ${sync.sync_status} (${sync.sync_source}), ${Math.round((sync.sync_end_time - sync.sync_start_time) / 1000)} s`];
    JSON.parse(sync.entity_status).pull
        .filter((entity) => entity.done > 0)
        .forEach((entity) => {
            const durations = Object.keys(entity).filter((key) => key.endsWith('Ms')).map((key) => `${key} ${Math.round(entity[key])}`).join(', ');
            lines.push(`${entity.entity}: ${entity.done} records; ${durations}`);
        });
    return lines;
}

if (require.main === module) {
    const [command, ...paths] = process.argv.slice(2);
    if (command === 'rows' && paths.length === 2) {
        const [today, direct] = paths.map((path) => new Database(path, {fileMustExist: true}));
        const results = TABLES.map((table) => diffTable(today, direct, table));
        results.forEach((result) => console.log(formatDiff(result)));
        process.exit(results.every(isClean) ? 0 : 1);
    } else if (command === 'timings' && paths.length === 1) {
        timings(new Database(paths[0], {fileMustExist: true})).forEach((line) => console.log(line));
    } else {
        console.error('Usage: node scripts/sync-row-diff.js rows <today.db> <direct.db> | timings <copy.db>');
        process.exit(2);
    }
}

module.exports = {TABLES, diffTable, formatDiff, isClean, timings};
