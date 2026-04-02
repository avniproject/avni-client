/**
 * Rule Query Pattern Performance Benchmark
 *
 * Measures timing for all 14 rule db query patterns used by server-defined
 * rules, at 1K individual scale (representative of medium org).
 *
 * Run: npx jest test/perf/RuleQueryBenchmarkTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../src/framework/db/SqliteProxy';
import _ from 'lodash';

const nodeSqliteAdapter = require('../helpers/nodeSqliteAdapter');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

const SEED = {individuals: 1000, enrolmentsPerInd: 2, pePerEnrolment: 3, generalEncPerInd: 1};

describe('Rule Query Pattern Benchmark', () => {
    let rawDb, proxy;
    const uuids = {individuals: [], enrolments: [], addr: []};

    beforeAll(() => {
        rawDb = nodeSqliteAdapter.open({name: `rule_bench_${Date.now()}.db`});
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);

        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);

        proxy = new SqliteProxy(rawDb, entityMappingConfig, tableMetaMap, realmSchemaMap);
        seedData();
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
        console.log('\n' + '='.repeat(80));
        console.log('RULE QUERY PATTERN BENCHMARK RESULTS');
        console.log('='.repeat(80));
        console.log(_.padEnd('Pattern', 60) + _.padStart('Time(ms)', 10) + _.padStart('Rows', 8));
        console.log('-'.repeat(78));
        for (const r of results) {
            console.log(_.padEnd(r.label, 60) + _.padStart(String(r.elapsed), 10) + _.padStart(String(r.rows), 8));
        }
        console.log('='.repeat(80) + '\n');
    });

    function seedData() {
        uuids.st1 = uuid(); uuids.st2 = uuid();
        uuids.g1 = uuid();
        uuids.prog1 = uuid();
        uuids.et1 = uuid(); uuids.et2 = uuid();

        proxy.write(() => {
            proxy.create('SubjectType', {uuid: uuids.st1, name: 'Individual', voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
            proxy.create('SubjectType', {uuid: uuids.st2, name: 'Household', voided: false, active: true, type: 'Household'}, true, {skipHydration: true});
            proxy.create('Gender', {uuid: uuids.g1, name: 'Female', voided: false}, true, {skipHydration: true});
            proxy.create('Program', {uuid: uuids.prog1, name: 'Child', voided: false, active: true, colour: '#000'}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: uuids.et1, name: 'Monthly monitoring', voided: false, active: true}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: uuids.et2, name: 'Screening', voided: false, active: true}, true, {skipHydration: true});

            for (let i = 0; i < 20; i++) {
                const a = uuid();
                uuids.addr.push(a);
                proxy.create('AddressLevel', {uuid: a, name: `Village_${i}`, level: 1, voided: false, type: uuid()}, true, {skipHydration: true});
            }

            for (let i = 0; i < SEED.individuals; i++) {
                const u = uuid();
                uuids.individuals.push(u);
                proxy.create('Individual', {
                    uuid: u, name: `Person_${i}`, firstName: `Person`, lastName: `${i}`,
                    dateOfBirth: new Date(1990, 0, 1), dateOfBirthVerified: true,
                    registrationDate: new Date(2024, i % 12, 1), voided: false,
                    subjectType: {uuid: i < 950 ? uuids.st1 : uuids.st2},
                    gender: {uuid: uuids.g1},
                    lowestAddressLevel: {uuid: uuids.addr[i % 20]},
                    observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"obs_${i}"}`}],
                }, true, {skipHydration: true});
            }

            for (let i = 0; i < SEED.individuals; i++) {
                for (let j = 0; j < SEED.enrolmentsPerInd; j++) {
                    const u = uuid();
                    uuids.enrolments.push(u);
                    proxy.create('ProgramEnrolment', {
                        uuid: u, individual: {uuid: uuids.individuals[i]},
                        program: {uuid: uuids.prog1},
                        enrolmentDateTime: new Date(2024, 3, 1),
                        programExitDateTime: (i === 0 && j === 0) ? new Date(2025, 1, 1) : null,
                        voided: false, observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"e_${i}_${j}"}`}],
                    }, true, {skipHydration: true});
                }
            }

            const now = Date.now(), dayMs = 86400000;
            for (let i = 0; i < uuids.enrolments.length; i++) {
                for (let j = 0; j < SEED.pePerEnrolment; j++) {
                    const isCompleted = j === 0;
                    proxy.create('ProgramEncounter', {
                        uuid: uuid(),
                        programEnrolment: {uuid: uuids.enrolments[i]},
                        encounterType: {uuid: j % 2 === 0 ? uuids.et1 : uuids.et2},
                        earliestVisitDateTime: !isCompleted ? new Date(now - dayMs * 2) : null,
                        maxVisitDateTime: !isCompleted ? new Date(now + dayMs * 5) : null,
                        encounterDateTime: isCompleted ? new Date(now - dayMs) : null,
                        voided: false,
                        observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"pe_${i}_${j}"}`}],
                        name: `Visit_${i}_${j}`,
                    }, true, {skipHydration: true});
                }
            }

            for (let i = 0; i < SEED.individuals; i++) {
                for (let j = 0; j < SEED.generalEncPerInd; j++) {
                    proxy.create('Encounter', {
                        uuid: uuid(), individual: {uuid: uuids.individuals[i]},
                        encounterType: {uuid: uuids.et2},
                        encounterDateTime: new Date(now - dayMs * i), voided: false,
                        observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"enc_${i}"}`}],
                        name: `Gen_${i}`,
                    }, true, {skipHydration: true});
                }
            }
        });

        const totalPE = uuids.enrolments.length * SEED.pePerEnrolment;
        console.log(`\nSeeded: ${SEED.individuals} Individuals, ${uuids.enrolments.length} Enrolments, ${totalPE} ProgramEncounters, ${SEED.individuals} Encounters\n`);
    }

    const results = [];

    function bench(label, fn) {
        const start = performance.now();
        const result = fn();
        // Force materialization — lazy proxies only execute on .length or [index] access
        if (typeof result !== 'number' && !Array.isArray(result) && result && typeof result.length === 'number') {
            const len = result.length;
            if (len > 0) { const _ = result[0]; }
        }
        const elapsed = Math.round((performance.now() - start) * 10) / 10;
        const rows = typeof result === 'number' ? result : (Array.isArray(result) ? result.length : (result?.length ?? '?'));
        results.push({label, elapsed, rows});
        return {elapsed, result};
    }

    it('P1: UUID lookup', () => {
        bench('P1: UUID lookup (AddressLevel)', () => {
            return proxy.objects('AddressLevel').filtered('uuid == $0', uuids.addr[0]);
        });
    });

    it('P2: filtered + JS .filter() on FK', () => {
        bench('P2: filtered(voided=false) + JS filter(subjectType)', () => {
            return proxy.objects('Individual').filtered('voided == false')
                .filter(ind => ind.subjectType && ind.subjectType.name === 'Household');
        });
    });

    it('P3: SUBQUERY on enrolments', () => {
        bench('P3: SUBQUERY(enrolments, active Child program)', () => {
            return proxy.objects('Individual').filtered(
                "SUBQUERY(enrolments, $enrolment, $enrolment.program.name = 'Child' and $enrolment.programExitDateTime = null and $enrolment.voided = false).@count > 0"
            );
        });
    });

    it('P4: Nested SUBQUERY (3 levels)', () => {
        bench('P4: Nested SUBQUERY enrolments→encounters→obs', () => {
            return proxy.objects('Individual').filtered(
                "SUBQUERY(enrolments, $enrolment, $enrolment.voided = false and $enrolment.programExitDateTime = null and SUBQUERY($enrolment.encounters, $encounter, $encounter.encounterType.name = 'Monthly monitoring' and $encounter.voided = false).@count > 0).@count > 0"
            );
        });
    });

    it('P5: Chained .filtered()', () => {
        bench('P5: Chained .filtered() (3 chains)', () => {
            return proxy.objects('ProgramEncounter')
                .filtered('voided = false AND encounterDateTime = null')
                .filtered('programEnrolment.voided = false')
                .filtered('programEnrolment.programExitDateTime = null');
        });
    });

    it('P6: IN clause', () => {
        const addrs = uuids.addr.slice(0, 5);
        const inStr = `{${addrs.map(u => `"${u}"`).join(', ')}}`;
        bench('P6: IN clause (5 address UUIDs)', () => {
            return proxy.objects('Individual').filtered(`voided = false AND lowestAddressLevel.uuid IN ${inStr}`);
        });
    });

    it('P7: CONTAINS on valueJSON in SUBQUERY', () => {
        bench('P7: SUBQUERY + CONTAINS on valueJSON', () => {
            return proxy.objects('Individual').filtered(
                "voided = false AND SUBQUERY(observations, $observation, $observation.valueJSON contains 'obs_50').@count > 0"
            );
        });
    });

    it('P8: JS filter with entity property traversal', () => {
        bench('P8: JS filter traversing enrolments list', () => {
            const all = proxy.objects('Individual').filtered('voided = false');
            return all.filter(ind => {
                const enrolments = ind.enrolments || [];
                return enrolments.length > 0;
            });
        });
    });

    it('P9: Deep property chain (3 levels)', () => {
        bench('P9: Deep chain PE→enrolment→individual→address', () => {
            const results = proxy.objects('ProgramEncounter').filtered('voided = false AND encounterDateTime <> null');
            const addrs = [];
            for (let i = 0; i < Math.min(100, results.length); i++) {
                const addr = results[i].programEnrolment?.individual?.lowestAddressLevel?.name;
                addrs.push(addr);
            }
            return addrs;
        });
    });

    it('P10: Count return', () => {
        bench('P10: .length for count (all Individuals)', () => {
            return proxy.objects('Individual').filtered('voided = false').length;
        });
    });

    it('P11: .map() with FK access', () => {
        bench('P11: .map(ind => address.name) on 1K individuals', () => {
            return proxy.objects('Individual').filtered('voided = false')
                .map(ind => ind.lowestAddressLevel && ind.lowestAddressLevel.name);
        });
    });

    it('P12: Service facade query', () => {
        bench('P12: filtered(subjectType.name=$0) (facade pattern)', () => {
            return proxy.objects('Individual').filtered('voided = false')
                .filtered('subjectType.name = $0', 'Individual');
        });
    });

    it('P13: Simple .length', () => {
        bench('P13: db.objects(AddressLevel).length', () => {
            return proxy.objects('AddressLevel').length;
        });
    });

    it('P14: Mixed filtered + JS filter', () => {
        bench('P14: SQL filter(encType) + JS filter(obs check)', () => {
            return proxy.objects('ProgramEncounter')
                .filtered("voided = false AND encounterType.name = $0", 'Monthly monitoring')
                .filter(enc => (enc.observations || []).length > 0);
        });
    });

    it('Bonus: Report card SUBQUERY + JS post-filter', () => {
        bench('Bonus: SUBQUERY prefilter + JS enrolment check', () => {
            return proxy.objects('Individual')
                .filtered("SUBQUERY(enrolments, $enrolment, $enrolment.program.name = 'Child' and $enrolment.programExitDateTime = null and $enrolment.voided = false).@count > 0")
                .filter(ind => ind.voided === false && _.some(ind.enrolments, e => e.program.name === 'Child'));
        });
    });

    it('Bonus: ProgramEncounter date filter + .map() to individual', () => {
        bench('Bonus: PE date filter + .map(→individual)', () => {
            return proxy.objects('ProgramEncounter')
                .filtered('voided = false AND encounterDateTime = null AND earliestVisitDateTime <> null AND programEnrolment.voided = false')
                .map(enc => enc.programEnrolment.individual);
        });
    });
});
