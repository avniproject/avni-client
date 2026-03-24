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

function getRealmData(filePath) {
    const Realm = require('realm');
    const {EntityMappingConfig} = require('openchs-models');
    const config = EntityMappingConfig.getInstance().getRealmConfig();
    config.path = path.resolve(filePath);
    delete config.encryptionKey;

    const realm = new Realm(config);
    const tables = {};
    const embeddedSchemas = new Set();

    for (const schema of realm.schema) {
        if (schema.embedded) {
            embeddedSchemas.add(schema.name);
            continue;
        }
        let count = -1;
        try {
            count = realm.objects(schema.name).length;
        } catch (e) {}
        tables[schema.name] = count;
    }

    // Get sync status
    const syncStatus = [];
    try {
        const ess = realm.objects('EntitySyncStatus');
        for (const e of ess) {
            syncStatus.push({
                entityName: e.entityName,
                entityTypeUuid: e.entityTypeUuid || '',
                loadedSince: e.loadedSince ? e.loadedSince.getTime() : 0,
            });
        }
    } catch (e) {}

    realm.close();
    return {tables, syncStatus, embeddedSchemas};
}

// --- Name mapping: Realm schema name → SQLite table name ---

function camelToSnake(str) {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .toLowerCase();
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

// --- Row count comparison ---
console.log('=== ROW COUNT COMPARISON ===');
console.log(String('Entity').padEnd(40) + String('Realm').padStart(10) + String('SQLite').padStart(10) + String('Diff').padStart(10));
console.log('-'.repeat(70));

let diffs = 0;
let totalRealmRows = 0;
let totalSqliteRows = 0;
const diffDetails = [];

for (const rn of realmNames) {
    const sn = nameMap[rn];
    const realmCount = realm.tables[rn];
    const sqliteCount = sqliteTableSet.has(sn) ? sqliteCounts[sn] : -1;

    if (realmCount === -1 && sqliteCount === -1) continue;

    totalRealmRows += Math.max(realmCount, 0);
    totalSqliteRows += Math.max(sqliteCount, 0);

    const diff = (sqliteCount >= 0 ? sqliteCount : 0) - (realmCount >= 0 ? realmCount : 0);
    const diffStr = diff === 0 ? '' : (diff > 0 ? '+' + diff : String(diff));

    if (diff !== 0) {
        diffs++;
        diffDetails.push({name: rn, realmCount, sqliteCount, diff});
    }

    // Only print rows with differences or non-zero counts
    if (diff !== 0 || realmCount > 0 || sqliteCount > 0) {
        const sqliteStr = sqliteCount === -1 ? 'MISSING' : String(sqliteCount);
        console.log(rn.padEnd(40) + String(realmCount).padStart(10) + sqliteStr.padStart(10) + diffStr.padStart(10));
    }
}

console.log('-'.repeat(70));
console.log(String('TOTAL').padEnd(40) + String(totalRealmRows).padStart(10) + String(totalSqliteRows).padStart(10) + String(totalSqliteRows - totalRealmRows).padStart(10));
console.log('');

// --- Sync status comparison ---
console.log('=== SYNC STATUS (entities not fully synced in SQLite) ===');
const sqliteSyncStatus = getSqliteSyncStatus(sqliteFile);
const EPOCH_NEVER = -2208988800000; // ~1900 — the "never synced" marker

const notSynced = sqliteSyncStatus.filter(s => s.loadedSince <= EPOCH_NEVER || s.loadedSince <= 0);
const synced = sqliteSyncStatus.filter(s => s.loadedSince > 0 && s.loadedSince > EPOCH_NEVER);

if (notSynced.length > 0) {
    console.log(`${notSynced.length} entity-type combinations NOT synced:`);
    for (const s of notSynced) {
        console.log(`  ${s.entityName} (type: ${s.entityTypeUuid || 'all'})`);
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
