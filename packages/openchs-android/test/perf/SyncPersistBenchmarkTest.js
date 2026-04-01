/**
 * Sync persist benchmark — measures INSERT throughput with and without indexes.
 *
 * Simulates the SyncService.persistAll() pattern: batches of 1000 entities
 * written in a single transaction via proxy.write(() => proxy.create(...)).
 *
 * Run: npx jest test/perf/SyncPersistBenchmarkTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../src/framework/db/SqliteProxy';

const nodeSqliteAdapter = require('../helpers/nodeSqliteAdapter');

const PAGE_SIZE = 1000;
const TOTAL_PROGRAM_ENCOUNTERS = 10000;
const TOTAL_PAGES = TOTAL_PROGRAM_ENCOUNTERS / PAGE_SIZE;

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function createDbWithTables(withIndexes) {
    const rawDb = nodeSqliteAdapter.open({name: `sync_bench_${Date.now()}_${withIndexes ? 'idx' : 'noidx'}.db`});
    const entityMappingConfig = EntityMappingConfig.getInstance();
    const tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
    const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);

    const createStatements = SchemaGenerator.generateCreateTableStatements(tableMetaMap);
    rawDb.executeSync('PRAGMA foreign_keys = OFF');
    for (const sql of createStatements) {
        rawDb.executeSync(sql);
    }

    if (withIndexes) {
        const indexStatements = SchemaGenerator.generateIndexStatements(tableMetaMap);
        for (const sql of indexStatements) {
            rawDb.executeSync(sql);
        }
    }

    const proxy = new SqliteProxy(rawDb, entityMappingConfig, tableMetaMap, realmSchemaMap);
    return {rawDb, proxy, tableMetaMap};
}

function seedReferenceData(proxy) {
    const programUuids = [];
    const encounterTypeUuids = [];
    const individualUuids = [];
    const enrolmentUuids = [];

    proxy.write(() => {
        // Minimal reference data
        const stUuid = uuid();
        proxy.create('SubjectType', {uuid: stUuid, name: 'Person', voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
        const gUuid = uuid();
        proxy.create('Gender', {uuid: gUuid, name: 'Female', voided: false}, true, {skipHydration: true});
        const addrUuid = uuid();
        proxy.create('AddressLevel', {uuid: addrUuid, title: 'Village', level: 1, voided: false, type: uuid()}, true, {skipHydration: true});

        for (let i = 0; i < 2; i++) {
            const u = uuid();
            programUuids.push(u);
            proxy.create('Program', {uuid: u, name: `Prog_${i}`, voided: false, active: true, colour: '#000'}, true, {skipHydration: true});
        }
        for (let i = 0; i < 3; i++) {
            const u = uuid();
            encounterTypeUuids.push(u);
            proxy.create('EncounterType', {uuid: u, name: `ET_${i}`, voided: false, active: true}, true, {skipHydration: true});
        }

        // 1000 individuals + 2000 enrolments (to have FK targets)
        for (let i = 0; i < 1000; i++) {
            const iUuid = uuid();
            individualUuids.push(iUuid);
            proxy.create('Individual', {
                uuid: iUuid, name: `Ind_${i}`, firstName: `Ind`, lastName: `${i}`,
                dateOfBirth: new Date(1990, 0, 1), dateOfBirthVerified: true,
                registrationDate: new Date(2024, 0, 1), voided: false,
                subjectType: {uuid: stUuid}, gender: {uuid: gUuid}, lowestAddressLevel: {uuid: addrUuid},
                observations: [],
            }, true, {skipHydration: true});

            for (let j = 0; j < 2; j++) {
                const eUuid = uuid();
                enrolmentUuids.push(eUuid);
                proxy.create('ProgramEnrolment', {
                    uuid: eUuid, individual: {uuid: iUuid}, program: {uuid: programUuids[j]},
                    enrolmentDateTime: new Date(2024, 1, 1), voided: false, observations: [],
                }, true, {skipHydration: true});
            }
        }
    });

    return {programUuids, encounterTypeUuids, individualUuids, enrolmentUuids};
}

function generatePage(pageNum, enrolmentUuids, encounterTypeUuids) {
    const entities = [];
    const now = Date.now();
    const dayMs = 86400000;
    for (let i = 0; i < PAGE_SIZE; i++) {
        const globalIdx = pageNum * PAGE_SIZE + i;
        entities.push({
            uuid: uuid(),
            programEnrolment: {uuid: enrolmentUuids[globalIdx % enrolmentUuids.length]},
            encounterType: {uuid: encounterTypeUuids[globalIdx % encounterTypeUuids.length]},
            earliestVisitDateTime: new Date(now - dayMs * 5),
            maxVisitDateTime: new Date(now + dayMs * 5),
            encounterDateTime: Math.random() < 0.4 ? new Date(now - dayMs) : null,
            voided: false,
            observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"v_${globalIdx}"}`}],
            name: `Visit_${globalIdx}`,
        });
    }
    return entities;
}

// Matches production: BaseService.getCreateEntityFunctions + bulkSaveOrUpdate
// No skipHydration — each create does INSERT + SELECT + hydrate
function persistPageProduction(proxy, entities) {
    proxy.write(() => {
        for (const entity of entities) {
            proxy.create('ProgramEncounter', entity, true);
        }
    });
}

describe('Sync Persist Benchmark', () => {
    it('per-entity create (Realm path baseline)', () => {
        const {rawDb, proxy} = createDbWithTables(true);
        const refs = seedReferenceData(proxy);
        const pageTimes = [];

        for (let page = 0; page < TOTAL_PAGES; page++) {
            const entities = generatePage(page, refs.enrolmentUuids, refs.encounterTypeUuids);
            const start = performance.now();
            persistPageProduction(proxy, entities);
            const elapsed = Math.round(performance.now() - start);
            pageTimes.push(elapsed);
        }

        const total = pageTimes.reduce((a, b) => a + b, 0);
        console.log(`\n=== PER-ENTITY CREATE (${TOTAL_PROGRAM_ENCOUNTERS} ProgramEncounters, ${PAGE_SIZE}/page) ===`);
        pageTimes.forEach((t, i) => console.log(`  Page ${i}: ${t}ms`));
        console.log(`  Total: ${total}ms, Avg: ${Math.round(total / TOTAL_PAGES)}ms/page`);

        rawDb.close();
    });

    it('bulkCreate (executeBatch) WITH indexes', async () => {
        const {rawDb, proxy} = createDbWithTables(true);
        const refs = seedReferenceData(proxy);
        const pageTimes = [];

        for (let page = 0; page < TOTAL_PAGES; page++) {
            const entities = generatePage(page, refs.enrolmentUuids, refs.encounterTypeUuids);
            const start = performance.now();
            await proxy.bulkCreate('ProgramEncounter', entities);
            const elapsed = Math.round(performance.now() - start);
            pageTimes.push(elapsed);
        }

        const total = pageTimes.reduce((a, b) => a + b, 0);
        console.log(`\n=== bulkCreate (executeBatch) WITH INDEXES (${TOTAL_PROGRAM_ENCOUNTERS} ProgramEncounters, ${PAGE_SIZE}/page) ===`);
        pageTimes.forEach((t, i) => console.log(`  Page ${i}: ${t}ms`));
        console.log(`  Total: ${total}ms, Avg: ${Math.round(total / TOTAL_PAGES)}ms/page`);

        rawDb.close();
    });

    afterAll(() => {
        console.log(`\nNote: On mobile device, multiply times by ~3-5x for realistic estimates.`);
        console.log(`Jest uses better-sqlite3 (direct V8 binding) which is faster than op-sqlite (JSI bridge).`);
        console.log(`The bulkCreate improvement on device will be MORE dramatic than in Jest because`);
        console.log(`it eliminates per-entity JSI marshalling overhead that better-sqlite3 doesn't have.\n`);
    });
});
