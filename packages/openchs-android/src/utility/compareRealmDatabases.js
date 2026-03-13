#!/usr/bin/env node

/**
 * Compare two Realm database files — schema, row counts (including embedded objects).
 *
 * Usage:
 *   node compareRealmDatabases.js <realmFileA> <realmFileB>
 *
 * Example:
 *   node src/utility/compareRealmDatabases.js /path/to/branch.realm /path/to/master.realm
 */

const Realm = require('realm');

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
    console.error('Usage: node compareRealmDatabases.js <realmFileA> <realmFileB>');
    process.exit(1);
}

function analyze(filePath) {
    const realm = new Realm({path: filePath, readOnly: true});
    const result = {version: realm.schemaVersion, typeCount: realm.schema.length, tables: {}};
    for (const schema of realm.schema.sort((a, b) => a.name.localeCompare(b.name))) {
        let count = null;
        try { count = realm.objects(schema.name).length; } catch (e) { count = -1; }
        const props = {};
        for (const [k, v] of Object.entries(schema.properties)) {
            if (typeof v === 'string') props[k] = v;
            else props[k] = v.type + (v.objectType ? '<' + v.objectType + '>' : '') + (v.optional ? '?' : '');
        }
        result.tables[schema.name] = {count, pk: schema.primaryKey || null, embedded: schema.embedded || false, props};
    }
    realm.close();
    return result;
}

function countEmbedded(filePath) {
    const realm = new Realm({path: filePath, readOnly: true});
    const counts = {};
    for (const schema of realm.schema) {
        if (schema.embedded) continue;
        let objects;
        try { objects = realm.objects(schema.name); } catch (e) { continue; }
        if (objects.length === 0) continue;
        for (const [prop, def] of Object.entries(schema.properties)) {
            const propDef = typeof def === 'string' ? {type: def} : def;
            if (propDef.type === 'list' && propDef.objectType) {
                const targetSchema = realm.schema.find(s => s.name === propDef.objectType);
                if (targetSchema && targetSchema.embedded) {
                    const key = propDef.objectType;
                    if (!counts[key]) counts[key] = 0;
                    for (const obj of objects) {
                        try { counts[key] += obj[prop].length; } catch (e) {}
                    }
                }
            }
        }
    }
    realm.close();
    return counts;
}

console.log('=== REALM DATABASE COMPARISON REPORT ===');
console.log('');
console.log('File A:', fileA);
console.log('File B:', fileB);
console.log('');

const a = analyze(fileA);
const b = analyze(fileB);

console.log('File A: schema v' + a.version + ', ' + a.typeCount + ' types');
console.log('File B: schema v' + b.version + ', ' + b.typeCount + ' types');
console.log('');

const aNames = new Set(Object.keys(a.tables));
const bNames = new Set(Object.keys(b.tables));
const onlyA = [...aNames].filter(n => !bNames.has(n));
const onlyB = [...bNames].filter(n => !aNames.has(n));
if (onlyA.length) console.log('Tables ONLY in A:', onlyA.join(', '));
if (onlyB.length) console.log('Tables ONLY in B:', onlyB.join(', '));
if (!onlyA.length && !onlyB.length) console.log('Schema types: IDENTICAL (same ' + a.typeCount + ' types in both)');
console.log('');

// Row counts for non-embedded tables
console.log('=== ROW COUNT COMPARISON ===');
console.log(String('Table').padEnd(40) + String('A').padStart(10) + String('B').padStart(10) + String('Diff').padStart(10));
console.log('-'.repeat(70));
let diffs = 0;
for (const name of [...aNames].filter(n => bNames.has(n)).sort()) {
    const ac = a.tables[name].count;
    const bc = b.tables[name].count;
    if (ac === -1 && bc === -1) continue;
    const diff = ac - bc;
    const diffStr = diff === 0 ? '' : (diff > 0 ? '+' + diff : String(diff));
    if (diff !== 0) diffs++;
    console.log(name.padEnd(40) + String(ac).padStart(10) + String(bc).padStart(10) + diffStr.padStart(10));
}
console.log('');
console.log('Tables with different row counts: ' + diffs);
console.log('');

// Embedded object counts
console.log('=== EMBEDDED OBJECT COMPARISON ===');
const embA = countEmbedded(fileA);
const embB = countEmbedded(fileB);
const allEmbKeys = new Set([...Object.keys(embA), ...Object.keys(embB)]);
// Include embedded types with zero counts too
for (const name of Object.keys(a.tables)) {
    if (a.tables[name].embedded) allEmbKeys.add(name);
}
console.log(String('Type').padEnd(40) + String('A').padStart(10) + String('B').padStart(10) + String('Diff').padStart(10));
console.log('-'.repeat(70));
let embDiffs = 0;
for (const key of [...allEmbKeys].sort()) {
    const ac = embA[key] || 0;
    const bc = embB[key] || 0;
    const diff = ac - bc;
    if (diff !== 0) embDiffs++;
    const diffStr = diff === 0 ? '' : (diff > 0 ? '+' + diff : String(diff));
    console.log(key.padEnd(40) + String(ac).padStart(10) + String(bc).padStart(10) + diffStr.padStart(10));
}
console.log('');
console.log('Embedded types with differences: ' + embDiffs);
console.log('');

// Schema property differences
console.log('=== SCHEMA PROPERTY DIFFERENCES ===');
let propDiffs = 0;
for (const name of [...aNames].filter(n => bNames.has(n)).sort()) {
    const ap = a.tables[name].props;
    const bp = b.tables[name].props;
    const aKeys = new Set(Object.keys(ap));
    const bKeys = new Set(Object.keys(bp));
    const added = [...aKeys].filter(k => !bKeys.has(k));
    const removed = [...bKeys].filter(k => !aKeys.has(k));
    const changed = [...aKeys].filter(k => bKeys.has(k) && ap[k] !== bp[k]);
    if (added.length || removed.length || changed.length) {
        propDiffs++;
        console.log(name + ':');
        added.forEach(k => console.log('  + ' + k + ': ' + ap[k]));
        removed.forEach(k => console.log('  - ' + k + ': ' + bp[k]));
        changed.forEach(k => console.log('  ~ ' + k + ': ' + bp[k] + ' -> ' + ap[k]));
    }
    if (a.tables[name].pk !== b.tables[name].pk) {
        console.log(name + ': PK changed ' + b.tables[name].pk + ' -> ' + a.tables[name].pk);
    }
}
if (propDiffs === 0) console.log('No schema property differences found.');
console.log('');

console.log('=== SUMMARY ===');
console.log('Schema versions: ' + (a.version === b.version ? 'SAME (v' + a.version + ')' : 'DIFFERENT (A: v' + a.version + ', B: v' + b.version + ')'));
console.log('Object types: ' + (a.typeCount === b.typeCount ? 'SAME (' + a.typeCount + ')' : 'DIFFERENT (A: ' + a.typeCount + ', B: ' + b.typeCount + ')'));
console.log('Tables with row count diffs: ' + diffs);
console.log('Embedded types with diffs: ' + embDiffs);
console.log('Tables with property diffs: ' + propDiffs);
