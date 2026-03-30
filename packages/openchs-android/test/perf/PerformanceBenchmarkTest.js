/**
 * Performance benchmark test with synthetic data.
 *
 * Uses better-sqlite3 (via nodeSqliteAdapter) to create a real SQLite database,
 * seeds synthetic entities, and measures query/hydration performance through
 * the full SqliteProxy → SqliteResultsProxy → EntityHydrator stack.
 *
 * Run: npx jest test/perf/PerformanceBenchmarkTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../src/framework/db/SqliteProxy';
import _ from 'lodash';

// Use real SQLite via better-sqlite3 adapter (not the op-sqlite mock)
const nodeSqliteAdapter = require('../helpers/nodeSqliteAdapter');

// ── Test configuration ──
const SEED = {
    subjectTypes: 5,
    genders: 2,
    addressLevels: 50,
    individuals: 1000,
    programsPerSubjectType: 2,
    enrolmentsPerIndividual: 3,
    encountersPerEnrolment: 2,
    generalEncountersPerIndividual: 2,
    encounterTypes: 4,
};

const TARGETS = {
    searchMs: 20,
    dashboardMs: 1000,
    findByUuidMs: 5,
    hydrationMs: 20,
};

// ── Helpers ──
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function timeIt(label, fn) {
    const start = performance.now();
    const result = fn();
    const elapsed = Math.round((performance.now() - start) * 100) / 100;
    return {label, elapsed, result};
}

function randomDate(startYear, endYear) {
    const start = new Date(startYear, 0, 1).getTime();
    const end = new Date(endYear, 11, 31).getTime();
    return new Date(start + Math.random() * (end - start)).getTime();
}

function jsonObs(count = 3) {
    const obs = [];
    for (let i = 0; i < count; i++) {
        obs.push({concept: {uuid: uuid()}, valueJSON: JSON.stringify({value: `val_${i}_${Math.random().toString(36).substring(7)}` })});
    }
    return JSON.stringify(obs);
}

// ── Main test ──
describe('Performance Benchmark (synthetic data)', () => {
    let db, rawDb, proxy;
    let sampleUuids = {};

    beforeAll(() => {
        // 1. Open real SQLite database
        rawDb = nodeSqliteAdapter.open({name: `perf_bench_${Date.now()}.db`});

        // 2. Generate table schemas from Realm config
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);

        // 3. Create tables
        const createStatements = SchemaGenerator.generateCreateTableStatements(tableMetaMap);
        const indexStatements = SchemaGenerator.generateIndexStatements(tableMetaMap);

        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of createStatements) {
            rawDb.executeSync(sql);
        }
        for (const sql of indexStatements) {
            rawDb.executeSync(sql);
        }

        // 4. Create SqliteProxy
        proxy = new SqliteProxy(rawDb, entityMappingConfig, tableMetaMap, realmSchemaMap);

        // 5. Seed data
        seedData(proxy, rawDb);

        // 6. Build reference cache (like post-sync)
        proxy.buildReferenceCache([
            {schemaName: 'Gender', depth: 1, skipLists: true},
            {schemaName: 'SubjectType', depth: 1, skipLists: true},
            {schemaName: 'AddressLevel', depth: 1, skipLists: true},
            {schemaName: 'Program', depth: 1, skipLists: true},
            {schemaName: 'EncounterType', depth: 1, skipLists: true},
        ]);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    // ── Seed synthetic data using proxy.create() ──
    function seedData(p, db) {
        const subjectTypes = [], genders = [], addresses = [], programs = [], encounterTypes = [];
        const individualUuids = [];

        p.write(() => {
            // Reference data
            for (let i = 0; i < SEED.subjectTypes; i++) {
                const u = uuid();
                subjectTypes.push(u);
                p.create('SubjectType', {uuid: u, name: `SubjectType_${i}`, voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
            }

            for (let i = 0; i < SEED.genders; i++) {
                const u = uuid();
                genders.push(u);
                p.create('Gender', {uuid: u, name: i === 0 ? 'Male' : 'Female', voided: false}, true, {skipHydration: true});
            }

            for (let i = 0; i < SEED.addressLevels; i++) {
                const u = uuid();
                addresses.push(u);
                p.create('AddressLevel', {uuid: u, title: `Village_${i}`, level: 1, voided: false, type: uuid()}, true, {skipHydration: true});
            }

            for (let i = 0; i < SEED.encounterTypes; i++) {
                const u = uuid();
                encounterTypes.push(u);
                p.create('EncounterType', {uuid: u, name: `EncType_${i}`, voided: false, active: true}, true, {skipHydration: true});
            }

            for (let i = 0; i < SEED.subjectTypes; i++) {
                for (let j = 0; j < SEED.programsPerSubjectType; j++) {
                    const u = uuid();
                    programs.push(u);
                    p.create('Program', {uuid: u, name: `Program_${i}_${j}`, voided: false, active: true, colour: '#ff0000'}, true, {skipHydration: true});
                }
            }

            // Individuals
            const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Iris', 'Jack'];
            for (let i = 0; i < SEED.individuals; i++) {
                const u = uuid();
                individualUuids.push(u);
                const name = `${names[i % names.length]}_${i}`;
                p.create('Individual', {
                    uuid: u, name, firstName: name, lastName: `Last_${i}`,
                    dateOfBirth: new Date(randomDate(1980, 2010)),
                    dateOfBirthVerified: true,
                    registrationDate: new Date(randomDate(2020, 2025)),
                    voided: false,
                    subjectType: {uuid: subjectTypes[i % subjectTypes.length]},
                    gender: {uuid: genders[i % genders.length]},
                    lowestAddressLevel: {uuid: addresses[i % addresses.length]},
                    observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"obs_${i}"}`}],
                }, true, {skipHydration: true});
            }

            // ProgramEnrolments
            const enrolmentUuids = [];
            for (let i = 0; i < SEED.individuals; i++) {
                for (let j = 0; j < SEED.enrolmentsPerIndividual; j++) {
                    const u = uuid();
                    enrolmentUuids.push(u);
                    p.create('ProgramEnrolment', {
                        uuid: u,
                        individual: {uuid: individualUuids[i]},
                        program: {uuid: programs[j % programs.length]},
                        enrolmentDateTime: new Date(randomDate(2021, 2025)),
                        voided: false,
                        observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"enrol_${i}_${j}"}`}],
                    }, true, {skipHydration: true});
                }
            }

            // ProgramEncounters
            const now = Date.now();
            const dayMs = 86400000;
            for (let i = 0; i < enrolmentUuids.length; i++) {
                for (let j = 0; j < SEED.encountersPerEnrolment; j++) {
                    const isCompleted = Math.random() < 0.4;
                    const isOverdue = !isCompleted && Math.random() < 0.3;
                    p.create('ProgramEncounter', {
                        uuid: uuid(),
                        programEnrolment: {uuid: enrolmentUuids[i]},
                        encounterType: {uuid: encounterTypes[j % encounterTypes.length]},
                        earliestVisitDateTime: new Date(isOverdue ? now - dayMs * 10 : now - dayMs * 2),
                        maxVisitDateTime: new Date(isOverdue ? now - dayMs * 1 : now + dayMs * 5),
                        encounterDateTime: isCompleted ? new Date(randomDate(2023, 2025)) : null,
                        voided: false,
                        observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"penc_${i}_${j}"}`}],
                        name: `Visit_${j}`,
                    }, true, {skipHydration: true});
                }
            }

            // General Encounters
            for (let i = 0; i < SEED.individuals; i++) {
                for (let j = 0; j < SEED.generalEncountersPerIndividual; j++) {
                    const isCompleted = Math.random() < 0.5;
                    p.create('Encounter', {
                        uuid: uuid(),
                        individual: {uuid: individualUuids[i]},
                        encounterType: {uuid: encounterTypes[j % encounterTypes.length]},
                        earliestVisitDateTime: new Date(now - dayMs * 3),
                        maxVisitDateTime: new Date(now + dayMs * 7),
                        encounterDateTime: isCompleted ? new Date(randomDate(2023, 2025)) : null,
                        voided: false,
                        observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"enc_${i}_${j}"}`}],
                        name: `GenVisit_${j}`,
                    }, true, {skipHydration: true});
                }
            }

            sampleUuids = {
                individual: individualUuids[0],
                subjectType: subjectTypes[0],
                gender: genders[0],
            };
        });

        const totalEnrolments = SEED.individuals * SEED.enrolmentsPerIndividual;
        const totalProgramEncounters = totalEnrolments * SEED.encountersPerEnrolment;
        const totalEncounters = SEED.individuals * SEED.generalEncountersPerIndividual;
        console.log(`\nSeeded: ${SEED.individuals} Individuals, ${totalEnrolments} Enrolments, ${totalProgramEncounters} ProgramEncounters, ${totalEncounters} Encounters\n`);
    }

    // ── Benchmarks ──

    const results = [];

    function bench(label, fn, target = null) {
        const {elapsed, result} = timeIt(label, () => {
            const r = fn();
            if (typeof r === 'number') return r;
            if (r && typeof r.length === 'number') {
                // Force full hydration by accessing first entity
                const len = r.length;
                if (len > 0) { const _ = r[0]; }
                return r;
            }
            return r;
        });
        const rows = typeof result === 'number' ? result : (result?.length ?? '?');
        const status = target ? (elapsed <= target ? 'PASS' : 'FAIL') : '-';
        results.push({label, elapsed, rows, target, status});
        return {elapsed, result};
    }

    it('search: findAll(Individual).sorted(name)', () => {
        const {elapsed, result} = bench('findAll(Individual).sorted(name)', () => {
            return proxy.objects('Individual').sorted('name');
        });
        expect(result.length).toBe(SEED.individuals);
    });

    it('search: name CONTAINS[c]', () => {
        bench('search(name CONTAINS[c] "alice")', () => {
            return proxy.objects('Individual')
                .filtered('voided = false AND name CONTAINS[c] $0', 'alice')
                .sorted('name');
        }, TARGETS.searchMs);
    });

    it('search: findByUUID x10 avg', () => {
        const times = [];
        for (let i = 0; i < 10; i++) {
            const {elapsed} = timeIt('', () => {
                proxy.objectForPrimaryKey('Individual', sampleUuids.individual);
            });
            times.push(elapsed);
        }
        const avg = Math.round(_.mean(times) * 100) / 100;
        results.push({label: 'findByUUID(Individual) x10 avg', elapsed: avg, rows: 1, target: TARGETS.findByUuidMs, status: avg <= TARGETS.findByUuidMs ? 'PASS' : 'FAIL'});
    });

    it('dashboard: scheduled visits', () => {
        const now = new Date();
        const dateMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const dateMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        bench('dashboard: scheduled visits', () => {
            return proxy.objects('ProgramEncounter').filtered(
                'earliestVisitDateTime <= $0 AND maxVisitDateTime >= $1 AND encounterDateTime = null AND cancelDateTime = null AND programEnrolment.programExitDateTime = null AND programEnrolment.voided = false AND voided = false',
                dateMidnight, dateMorning
            );
        }, TARGETS.dashboardMs);
    });

    it('dashboard: overdue visits', () => {
        const dateMorning = new Date();
        dateMorning.setHours(0, 0, 0, 0);

        bench('dashboard: overdue visits', () => {
            return proxy.objects('ProgramEncounter').filtered(
                'maxVisitDateTime < $0 AND cancelDateTime = null AND encounterDateTime = null AND programEnrolment.programExitDateTime = null AND programEnrolment.voided = false AND voided = false',
                dateMorning
            );
        }, TARGETS.dashboardMs);
    });

    it('dashboard: total subjects', () => {
        bench('dashboard: total subjects', () => {
            return proxy.objects('Individual').filtered('voided = false').sorted('name');
        }, TARGETS.dashboardMs);
    });

    it('dashboard: general encounters scheduled', () => {
        const now = new Date();
        const dateMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const dateMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        bench('dashboard: general encounters scheduled', () => {
            return proxy.objects('Encounter').filtered(
                'earliestVisitDateTime <= $0 AND maxVisitDateTime >= $1 AND encounterDateTime = null AND cancelDateTime = null AND individual.voided = false AND voided = false',
                dateMidnight, dateMorning
            );
        }, TARGETS.dashboardMs);
    });

    it('dashboard: scheduled visits SHALLOW', () => {
        const now = new Date();
        const dateMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const dateMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        bench('dashboard: scheduled visits SHALLOW', () => {
            return proxy.objects('ProgramEncounter')
                .withHydration({skipLists: true, depth: 1})
                .filtered(
                    'earliestVisitDateTime <= $0 AND maxVisitDateTime >= $1 AND encounterDateTime = null AND cancelDateTime = null AND programEnrolment.programExitDateTime = null AND programEnrolment.voided = false AND voided = false',
                    dateMidnight, dateMorning
                );
        }, TARGETS.dashboardMs);
    });

    it('dashboard: scheduled visits COUNT', () => {
        const now = new Date();
        const dateMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const dateMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        bench('dashboard: scheduled visits COUNT', () => {
            return proxy.objects('ProgramEncounter')
                .filtered(
                    'earliestVisitDateTime <= $0 AND maxVisitDateTime >= $1 AND encounterDateTime = null AND cancelDateTime = null AND programEnrolment.programExitDateTime = null AND programEnrolment.voided = false AND voided = false',
                    dateMidnight, dateMorning
                ).count();
        }, TARGETS.dashboardMs);
    });

    it('hydration: access FK fields on 1000 individuals', () => {
        const all = proxy.objects('Individual').filtered('voided = false');
        const count = Math.min(all.length, 1000);

        bench(`hydration: ${count} individuals (name+subjectType+address)`, () => {
            for (let i = 0; i < count; i++) {
                const ind = all[i];
                const _name = ind.name;
                const _st = ind.subjectType && ind.subjectType.name;
                const _addr = ind.lowestAddressLevel && ind.lowestAddressLevel.title;
            }
            return count;
        }, TARGETS.hydrationMs);
    });

    it('search: name CONTAINS[c] with shallow hydration', () => {
        bench('search(CONTAINS[c] "alice") SHALLOW', () => {
            return proxy.objects('Individual')
                .withHydration({skipLists: true, depth: 1})
                .filtered('voided = false AND name CONTAINS[c] $0', 'alice')
                .sorted('name');
        }, TARGETS.searchMs);
    });

    it('search: observation keyword search', () => {
        bench('search(observations.valueJSON contains[c])', () => {
            return proxy.objects('Individual')
                .filtered('observations.valueJSON contains[c] $0', 'obs_50');
        }, TARGETS.searchMs);
    });

    it('search: observation keyword search SHALLOW', () => {
        bench('search(obs contains[c]) SHALLOW', () => {
            return proxy.objects('Individual')
                .withHydration({skipLists: true, depth: 1})
                .filtered('observations.valueJSON contains[c] $0', 'obs_50');
        }, TARGETS.searchMs);
    });

    it('search: findAll with shallow hydration', () => {
        bench('findAll(Individual).sorted(name) SHALLOW', () => {
            return proxy.objects('Individual')
                .withHydration({skipLists: true, depth: 1})
                .sorted('name');
        });
    });

    it('location: hierarchy traversal (DB queries vs cached)', () => {
        // Seed a 4-level hierarchy: 5 states × 10 districts × 10 blocks × 4 villages = 2,225 nodes
        const stateUuids = [];
        proxy.write(() => {
            for (let s = 0; s < 5; s++) {
                const stateUuid = uuid();
                stateUuids.push(stateUuid);
                proxy.create('AddressLevel', {uuid: stateUuid, title: `State_${s}`, level: 4, voided: false, type: uuid(), parentUuid: null}, true, {skipHydration: true});
                for (let d = 0; d < 10; d++) {
                    const distUuid = uuid();
                    proxy.create('AddressLevel', {uuid: distUuid, title: `District_${s}_${d}`, level: 3, voided: false, type: uuid(), parentUuid: stateUuid}, true, {skipHydration: true});
                    for (let b = 0; b < 10; b++) {
                        const blockUuid = uuid();
                        proxy.create('AddressLevel', {uuid: blockUuid, title: `Block_${s}_${d}_${b}`, level: 2, voided: false, type: uuid(), parentUuid: distUuid}, true, {skipHydration: true});
                        for (let v = 0; v < 4; v++) {
                            proxy.create('AddressLevel', {uuid: uuid(), title: `Village_${s}_${d}_${b}_${v}`, level: 1, voided: false, type: uuid(), parentUuid: blockUuid}, true, {skipHydration: true});
                        }
                    }
                }
            }
        });

        // Old: DB query per getChildren call (recursive)
        bench('location: getDescendants DB queries (2K nodes)', () => {
            function getDescendantsViaDb(parentUuid) {
                const children = [...proxy.objects('AddressLevel').filtered(`parentUuid = "${parentUuid}" AND voided = false`)];
                let result = [...children];
                for (const child of children) {
                    result = result.concat(getDescendantsViaDb(child.uuid));
                }
                return result;
            }
            return getDescendantsViaDb(stateUuids[0]).length;
        });

        // New: build cache once, traverse in memory
        bench('location: getDescendants cached (2K nodes)', () => {
            // Build lookup map (done once)
            const all = proxy.objects('AddressLevel').filtered('voided = false');
            const childrenByParent = new Map();
            for (let i = 0; i < all.length; i++) {
                const al = all[i];
                const key = al.parentUuid || '__root__';
                if (!childrenByParent.has(key)) childrenByParent.set(key, []);
                childrenByParent.get(key).push(al);
            }
            function getDescendantsCached(parentUuid) {
                const children = childrenByParent.get(parentUuid) || [];
                let result = [...children];
                for (const child of children) {
                    result = result.concat(getDescendantsCached(child.uuid));
                }
                return result;
            }
            return getDescendantsCached(stateUuids[0]).length;
        });
    });

    it('filtered: active enrolments', () => {
        bench('active enrolments', () => {
            return proxy.objects('ProgramEnrolment')
                .filtered('programExitDateTime = null AND voided = false');
        });
    });

    afterAll(() => {
        // Print summary
        console.log('\n' + '='.repeat(95));
        console.log('PERFORMANCE BENCHMARK RESULTS (synthetic data)');
        console.log('='.repeat(95));
        console.log(
            _.padEnd('Benchmark', 55) +
            _.padStart('Time(ms)', 10) +
            _.padStart('Rows', 8) +
            _.padStart('Target', 10) +
            _.padStart('Status', 8)
        );
        console.log('-'.repeat(91));
        for (const r of results) {
            console.log(
                _.padEnd(r.label, 55) +
                _.padStart(String(r.elapsed), 10) +
                _.padStart(String(r.rows), 8) +
                _.padStart(r.target != null ? `≤${r.target}` : '-', 10) +
                _.padStart(r.status, 8)
            );
        }
        console.log('-'.repeat(91));
        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;
        const noTarget = results.filter(r => r.status === '-').length;
        console.log(`PASSED: ${passed}  FAILED: ${failed}  NO TARGET: ${noTarget}`);
        console.log('='.repeat(95) + '\n');
    });
});
