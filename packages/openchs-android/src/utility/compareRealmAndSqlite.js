#!/usr/bin/env node

/**
 * Compare a Realm database and a SQLite database — row counts and sync status.
 *
 * Usage:
 *   node compareRealmAndSqlite.js <realmFile> <sqliteFile>
 *
 * Example:
 *   node src/utility/compareRealmAndSqlite.js ../db/default.realm ../db/avni_sqlite.db
 *
 * Requires: Node 20+, realm and better-sqlite3 (or sqlite3 CLI as fallback)
 */

const {execSync} = require('child_process');
const path = require('path');

const [realmFile, sqliteFile] = process.argv.slice(2);
if (!realmFile || !sqliteFile) {
    console.error('Usage: node compareRealmAndSqlite.js <realmFile> <sqliteFile>');
    process.exit(1);
}

// --- SQLite via sqlite3 CLI ---

function sqliteQuery(db, sql) {
    try {
        const result = execSync(`sqlite3 "${db}" "${sql}"`, {encoding: 'utf-8'}).trim();
        return result ? result.split('\n') : [];
    } catch (e) {
        return [];
    }
}

function getSqliteTables(db) {
    return sqliteQuery(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_version' ORDER BY name");
}

function getSqliteCount(db, table) {
    const rows = sqliteQuery(db, `SELECT COUNT(*) FROM ${table}`);
    return rows.length > 0 ? parseInt(rows[0], 10) : 0;
}

function getSqliteSyncStatus(db) {
    const rows = sqliteQuery(db, "SELECT entity_name, entity_type_uuid, loaded_since FROM entity_sync_status ORDER BY entity_name");
    return rows.map(r => {
        const [entityName, entityTypeUuid, loadedSince] = r.split('|');
        return {entityName, entityTypeUuid, loadedSince: parseInt(loadedSince, 10)};
    });
}

// --- Realm via realm module ---

// Embedded schemas that are stored as JSON columns in SQLite (not separate tables)
const EMBEDDED_SCHEMA_NAMES = new Set([
    "Observation", "Point", "SubjectLocation", "KeyValue",
    "EmbeddedKeyValue", "Format", "ChecklistItemStatus",
    "ConceptMedia", "ReportCardResult",
]);

function getRealmData(filePath) {
    const Realm = require('realm');
    const {EntityMappingConfig} = require('openchs-models');
    const config = EntityMappingConfig.getInstance().getRealmConfig();
    config.path = path.resolve(filePath);
    delete config.encryptionKey;

    const realm = new Realm(config);
    const tables = {};
    const realmSchemas = Array.from(realm.schema);

    const danglingCounts = {};
    for (const schema of realm.schema) {
        let count = -1;
        try {
            const all = realm.objects(schema.name);
            count = all.length;

            // For embedded types, also count entries with no parent (dangling)
            if (EMBEDDED_SCHEMA_NAMES.has(schema.name) && count > 0) {
                try {
                    const linked = all.filtered('@links.@count > 0').length;
                    danglingCounts[schema.name] = count - linked;
                } catch (_) {}
            }
        } catch (e) {}
        tables[schema.name] = count;
    }

    // Get sync status and Realm row counts per entity-type combination
    const syncStatus = [];
    const EPOCH_NEVER = -2208988800000;
    // Map of "entityName|typeUuid" → realmCount for unsynced types
    const unsyncedRealmCounts = {};
    try {
        const ess = realm.objects('EntitySyncStatus');
        for (const e of ess) {
            const loadedSince = e.loadedSince ? e.loadedSince.getTime() : 0;
            syncStatus.push({
                entityName: e.entityName,
                entityTypeUuid: e.entityTypeUuid || '',
                loadedSince,
            });

            // For unsynced types, count Realm rows to show the data gap
            if (loadedSince <= EPOCH_NEVER || loadedSince <= 0) {
                const typeUuid = e.entityTypeUuid || '';
                let count = 0;
                // Skip filtered queries if the entity has no rows at all
                const totalForEntity = tables[e.entityName];
                if (totalForEntity > 0) {
                    try {
                        if (typeUuid) {
                            const filterPatterns = [
                                'program.uuid == $0',
                                'subjectType.uuid == $0',
                                'encounterType.uuid == $0',
                            ];
                            for (const filter of filterPatterns) {
                                try {
                                    count = realm.objects(e.entityName).filtered(filter, typeUuid).length;
                                    if (count > 0) break;
                                } catch (_) {}
                            }
                        } else {
                            count = totalForEntity;
                        }
                    } catch (_) {}
                }
                unsyncedRealmCounts[`${e.entityName}|${typeUuid}`] = count;
            }
        }
    } catch (e) {}

    realm.close();
    return {tables, syncStatus, realmSchemas, unsyncedRealmCounts, danglingCounts};
}

// --- Name mapping: Realm schema name → SQLite table name ---

function camelToSnake(str) {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .toLowerCase();
}

// --- Embedded object counting ---

/**
 * Count embedded Observation/Point objects stored as JSON in SQLite columns.
 *
 * In Realm, Observation and Point are embedded schemas with their own row counts.
 * In SQLite, they are stored as JSON columns on parent tables:
 *   - Observation lists → JSON arrays in text columns (each array element = 1 Observation)
 *   - Point objects → JSON objects in text columns (each non-null value = 1 Point)
 */
function countEmbeddedInSqlite(db, realmSchemas) {
    // Map of embedded schema name → { parentTable, column, type: 'list'|'object' }
    const embeddedColumns = {Observation: [], Point: []};

    for (const schema of realmSchemas) {
        if (schema.embedded) continue;
        const sqliteTable = camelToSnake(schema.name);
        for (const [propName, prop] of Object.entries(schema.properties)) {
            const objType = typeof prop === 'object' ? prop.objectType : prop;
            const propType = typeof prop === 'object' ? prop.type : null;
            if (objType === 'Observation' && propType === 'list') {
                embeddedColumns.Observation.push({table: sqliteTable, column: camelToSnake(propName)});
            } else if (objType === 'Point') {
                embeddedColumns.Point.push({table: sqliteTable, column: camelToSnake(propName)});
            }
        }
    }

    const counts = {};
    for (const [schemaName, columns] of Object.entries(embeddedColumns)) {
        let total = 0;
        const details = [];
        for (const {table, column} of columns) {
            let count = 0;
            if (schemaName === 'Observation') {
                const rows = sqliteQuery(db, `SELECT COALESCE(SUM(json_array_length(${column})), 0) FROM ${table} WHERE ${column} IS NOT NULL AND ${column} <> '[]'`);
                count = rows.length > 0 ? parseInt(rows[0], 10) || 0 : 0;
            } else {
                const rows = sqliteQuery(db, `SELECT COUNT(*) FROM ${table} WHERE ${column} IS NOT NULL AND ${column} <> ''`);
                count = rows.length > 0 ? parseInt(rows[0], 10) || 0 : 0;
            }
            if (count > 0) {
                details.push({table, column, count});
            }
            total += count;
        }
        counts[schemaName] = {total, details};
    }
    return counts;
}

// --- Main ---

console.log('=== REALM vs SQLITE DATABASE COMPARISON ===');
console.log('');
console.log('Realm:  ', realmFile);
console.log('SQLite: ', sqliteFile);
console.log('');

const realm = getRealmData(realmFile);
const sqliteTables = getSqliteTables(sqliteFile);
const sqliteTableSet = new Set(sqliteTables);

// Build counts
const realmNames = Object.keys(realm.tables).sort();
const sqliteCounts = {};
for (const t of sqliteTables) {
    sqliteCounts[t] = getSqliteCount(sqliteFile, t);
}

// Map realm names to sqlite names
const nameMap = {};
for (const rn of realmNames) {
    nameMap[rn] = camelToSnake(rn);
}

// --- Embedded object counts (Observation, Point stored as JSON in SQLite) ---
const embeddedCounts = countEmbeddedInSqlite(sqliteFile, realm.realmSchemas);

// --- Row count comparison ---
console.log('=== ROW COUNT COMPARISON ===');
console.log(String('Entity').padEnd(40) + String('Realm').padStart(20) + String('SQLite').padStart(16) + String('Diff').padStart(10));
console.log('-'.repeat(86));

let diffs = 0;
let totalRealmRows = 0;
let totalSqliteRows = 0;
const diffDetails = [];

for (const rn of realmNames) {
    const sn = nameMap[rn];
    const realmCountRaw = realm.tables[rn];
    const dangling = realm.danglingCounts[rn] || 0;
    // For embedded schemas, use linked-only count (exclude dangling orphans)
    const isEmbedded = EMBEDDED_SCHEMA_NAMES.has(rn);
    const realmCount = (isEmbedded && dangling > 0) ? realmCountRaw - dangling : realmCountRaw;
    let sqliteCount;

    // Embedded schemas: count from JSON columns instead of tables
    if (isEmbedded && embeddedCounts[rn]) {
        sqliteCount = embeddedCounts[rn].total;
    } else {
        sqliteCount = sqliteTableSet.has(sn) ? sqliteCounts[sn] : -1;
    }

    if (realmCount === -1 && sqliteCount === -1) continue;

    totalRealmRows += Math.max(realmCount, 0);
    totalSqliteRows += Math.max(sqliteCount, 0);

    const diff = (sqliteCount >= 0 ? sqliteCount : 0) - (realmCount >= 0 ? realmCount : 0);
    const diffStr = diff === 0 ? '' : (diff > 0 ? '+' + diff : String(diff));

    if (diff !== 0) {
        diffs++;
        diffDetails.push({name: rn, realmCount, sqliteCount, diff, dangling});
    }

    // Only print rows with differences or non-zero counts
    if (diff !== 0 || realmCount > 0 || sqliteCount > 0) {
        let realmStr = String(realmCount);
        if (dangling > 0) realmStr += ` (${dangling} dangling)`;
        const sqliteStr = sqliteCount === -1 ? 'MISSING' : String(sqliteCount) + (isEmbedded && embeddedCounts[rn] ? ' (json)' : '');
        console.log(rn.padEnd(40) + realmStr.padStart(20) + sqliteStr.padStart(16) + diffStr.padStart(10));
    }
}

console.log('-'.repeat(86));
console.log(String('TOTAL').padEnd(40) + String(totalRealmRows).padStart(20) + String(totalSqliteRows).padStart(16) + String(totalSqliteRows - totalRealmRows).padStart(10));
console.log('');

// --- Sync status comparison ---
console.log('=== SYNC STATUS ===');
const sqliteSyncStatus = getSqliteSyncStatus(sqliteFile);
const EPOCH_NEVER = -2208988800000; // ~1900 — the "never synced" marker

const notSynced = sqliteSyncStatus.filter(s => s.loadedSince <= EPOCH_NEVER || s.loadedSince <= 0);
const synced = sqliteSyncStatus.filter(s => s.loadedSince > 0 && s.loadedSince > EPOCH_NEVER);

if (notSynced.length > 0) {
    let totalUnsyncedRows = 0;
    console.log(`${notSynced.length} entity-type combinations NOT synced (Realm rows missing from SQLite):`);
    for (const s of notSynced) {
        const key = `${s.entityName}|${s.entityTypeUuid || ''}`;
        const realmCount = realm.unsyncedRealmCounts[key] || 0;
        totalUnsyncedRows += realmCount;
        const typeLabel = s.entityTypeUuid || 'all';
        const countStr = realmCount > 0 ? ` → ${realmCount} rows in Realm only` : '';
        console.log(`  ${s.entityName} (type: ${typeLabel})${countStr}`);
    }
    if (totalUnsyncedRows > 0) {
        console.log(`  TOTAL: ${totalUnsyncedRows} rows in Realm not yet synced to SQLite`);
    }
} else {
    console.log('All entity types synced.');
}
console.log('');

if (synced.length > 0) {
    console.log(`${synced.length} entity-type combinations synced:`);
    for (const s of synced.sort((a, b) => b.loadedSince - a.loadedSince)) {
        const date = new Date(s.loadedSince).toISOString();
        console.log(`  ${s.entityName} (type: ${s.entityTypeUuid || 'all'}) → ${date}`);
    }
}
console.log('');

// --- Embedded object detail ---
const hasEmbeddedDetails = Object.values(embeddedCounts).some(c => c.details.length > 0);
if (hasEmbeddedDetails) {
    console.log('=== EMBEDDED OBJECT BREAKDOWN (stored as JSON in SQLite) ===');
    for (const [schemaName, {total, details}] of Object.entries(embeddedCounts)) {
        if (details.length === 0) continue;
        console.log(`  ${schemaName}: ${total} total across ${details.length} columns`);
        for (const d of details.sort((a, b) => b.count - a.count)) {
            console.log(`    ${d.table}.${d.column}: ${d.count}`);
        }
    }
    console.log('');
}

// --- Tables in SQLite but not mapped from Realm ---
const unmappedSqlite = sqliteTables.filter(t => !Object.values(nameMap).includes(t));
if (unmappedSqlite.length > 0) {
    console.log('=== SQLite tables not mapped to Realm ===');
    unmappedSqlite.forEach(t => console.log('  ' + t));
    console.log('');
}

// --- Summary ---
console.log('=== SUMMARY ===');
console.log(`Realm entities: ${realmNames.length} schemas, ${totalRealmRows} total rows`);
console.log(`SQLite tables: ${sqliteTables.length} tables, ${totalSqliteRows} total rows`);
console.log(`Row count differences: ${diffs} entities`);
console.log(`Missing rows in SQLite: ${totalRealmRows - totalSqliteRows}`);
console.log(`Unsynced entity types: ${notSynced.length}`);

if (diffDetails.length > 0) {
    console.log('');
    console.log('Largest discrepancies:');
    diffDetails.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    for (const d of diffDetails.slice(0, 10)) {
        console.log(`  ${d.name}: Realm=${d.realmCount}, SQLite=${d.sqliteCount} (${d.diff > 0 ? '+' : ''}${d.diff})`);
    }
}
