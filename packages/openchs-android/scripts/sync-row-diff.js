/**
 * Compares two copies of the phone's database after the same first sync, one saved by today's path and
 * one by rows built straight from the download (#2145), and reads the per-kind save times a sync
 * recorded. Prints table names, column names and counts only, never a value: a copy may hold records
 * from a production clone. Opens the copies read-write, so a pulled -wal file is applied; run it on
 * copies only.
 *
 *   node scripts/sync-row-diff.js rows <today.db> <direct.db>
 *   node scripts/sync-row-diff.js timings <copy.db>
 *
 * Exit codes: 0 every table matches apart from kept parent links (timings: it printed), 1 a table
 * differs, 2 the arguments are wrong or a copy or table could not be read. A table that cannot be read
 * is named on its own line and the others are still compared; 2 outranks 1.
 */
const Database = require('better-sqlite3');

const TABLES = ['individual', 'program_enrolment', 'program_encounter', 'encounter',
    'individual_relationship', 'checklist', 'checklist_item', 'entity_approval_status'];

// Both paths fill this link by recomputing it from the approval rows, so a difference in it means one path went wrong.
const APPROVAL_LINK = 'latest_entity_approval_status_uuid';

// Names a table and a copy, never the driver's message.
class UnreadableTable extends Error {
    constructor(table, copy) {
        super(`${table}: not readable in ${copy}`);
    }
}

function diffTable(today, direct, table) {
    const rowsOf = (db, copy, query) => {
        try {
            return db.prepare(query).all();
        } catch (error) {
            throw new UnreadableTable(table, copy);
        }
    };
    const columns = rowsOf(today, 'today copy', `PRAGMA table_info(${table})`).map((column) => column.name);
    // A parent link is a declared foreign key, bar the approval link. created_by_uuid, filled_by_uuid,
    // entity_uuid and the like are plain text.
    const links = new Set(rowsOf(today, 'today copy', `PRAGMA foreign_key_list(${table})`)
        .map((fk) => fk.from).filter((column) => column !== APPROVAL_LINK));
    const byUuid = (db, copy) => new Map(rowsOf(db, copy, `SELECT * FROM ${table}`).map((row) => [row.uuid, row]));
    const todayRows = byUuid(today, 'today copy');
    const directRows = byUuid(direct, 'direct copy');
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
    let sync;
    try {
        // The last full sync: a background upload-only sync writes a newer row that pulled nothing (SyncService.syncSources).
        sync = db.prepare(`SELECT sync_status, sync_source, sync_start_time, sync_end_time, entity_status FROM sync_telemetry
            WHERE sync_status = 'complete' AND (sync_source IS NULL OR sync_source != 'automatic-upload-only')
            ORDER BY sync_start_time DESC LIMIT 1`).get();
    } catch (error) {
        throw new UnreadableTable('sync_telemetry', 'this copy');
    }
    if (!sync) return ['no completed full sync in this copy'];
    const headline = `sync ${sync.sync_status} (${sync.sync_source}), ${Math.round((sync.sync_end_time - sync.sync_start_time) / 1000)} s`;
    try {
        const kinds = JSON.parse(sync.entity_status).pull
            .filter((entity) => entity.done > 0)
            .map((entity) => {
                const durations = Object.keys(entity).filter((key) => key.endsWith('Ms')).map((key) => `${key} ${Math.round(entity[key])}`).join(', ');
                return `${entity.entity}: ${entity.done} records; ${durations}`;
            });
        return [headline, ...kinds];
    } catch (error) {
        // JSON.parse quotes the start of a malformed cell in its error, so whatever goes wrong here, say only that the cell could not be read.
        return [`${headline}; per-kind times not readable in this copy`];
    }
}

// A failure prints a fixed line, never the driver's message.
function openCopy(path, label) {
    try {
        return new Database(path, {fileMustExist: true});
    } catch (error) {
        console.log(`${label}: cannot be opened`);
        return null;
    }
}

if (require.main === module) {
    const [command, ...paths] = process.argv.slice(2);
    if (command === 'rows' && paths.length === 2) {
        const [today, direct] = [openCopy(paths[0], 'today copy'), openCopy(paths[1], 'direct copy')];
        if (!today || !direct) process.exit(2);
        let exitCode = 0;
        TABLES.forEach((table) => {
            try {
                const result = diffTable(today, direct, table);
                console.log(formatDiff(result));
                if (exitCode === 0 && !isClean(result)) exitCode = 1;
            } catch (error) {
                if (!(error instanceof UnreadableTable)) throw error;
                console.log(error.message);
                exitCode = 2;
            }
        });
        process.exit(exitCode);
    } else if (command === 'timings' && paths.length === 1) {
        const copy = openCopy(paths[0], 'copy');
        if (!copy) process.exit(2);
        try {
            timings(copy).forEach((line) => console.log(line));
        } catch (error) {
            if (!(error instanceof UnreadableTable)) throw error;
            console.log(error.message);
            process.exit(2);
        }
    } else {
        console.error('Usage: node scripts/sync-row-diff.js rows <today.db> <direct.db> | timings <copy.db>');
        process.exit(2);
    }
}

module.exports = {TABLES, diffTable, formatDiff, isClean, timings};
