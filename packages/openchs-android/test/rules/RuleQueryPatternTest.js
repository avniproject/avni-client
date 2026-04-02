/**
 * Rule Query Pattern Validation — tests all 14 db query patterns used by
 * server-defined rules against SqliteProxy with seeded data.
 *
 * Verifies that rules calling db.objects().filtered() etc. produce correct
 * results when the backend is SQLite instead of Realm.
 *
 * Run: npx jest test/rules/RuleQueryPatternTest.js --verbose
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

describe('Rule Query Patterns on SQLite', () => {
    let rawDb, proxy;
    const uuids = {};

    beforeAll(() => {
        rawDb = nodeSqliteAdapter.open({name: `rule_patterns_${Date.now()}.db`});
        const entityMappingConfig = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(entityMappingConfig);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(entityMappingConfig);

        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) {
            rawDb.executeSync(sql);
        }
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) {
            rawDb.executeSync(sql);
        }

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
    });

    function seedData() {
        uuids.subjectType1 = uuid();
        uuids.subjectType2 = uuid();
        uuids.gender1 = uuid();
        uuids.addr1 = uuid();
        uuids.addr2 = uuid();
        uuids.addr3 = uuid();
        uuids.program1 = uuid();
        uuids.encType1 = uuid();
        uuids.encType2 = uuid();
        uuids.individuals = [];
        uuids.enrolments = [];
        uuids.programEncounters = [];
        uuids.encounters = [];

        proxy.write(() => {
            proxy.create('SubjectType', {uuid: uuids.subjectType1, name: 'Individual', voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
            proxy.create('SubjectType', {uuid: uuids.subjectType2, name: 'Household', voided: false, active: true, type: 'Household'}, true, {skipHydration: true});
            proxy.create('Gender', {uuid: uuids.gender1, name: 'Female', voided: false}, true, {skipHydration: true});

            proxy.create('AddressLevel', {uuid: uuids.addr1, name: 'Village_A', level: 1, voided: false, type: uuid()}, true, {skipHydration: true});
            proxy.create('AddressLevel', {uuid: uuids.addr2, name: 'Village_B', level: 1, voided: false, type: uuid()}, true, {skipHydration: true});
            proxy.create('AddressLevel', {uuid: uuids.addr3, name: 'Village_C', level: 1, voided: false, type: uuid()}, true, {skipHydration: true});

            proxy.create('Program', {uuid: uuids.program1, name: 'Child', voided: false, active: true, colour: '#000'}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: uuids.encType1, name: 'Monthly monitoring', voided: false, active: true}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: uuids.encType2, name: 'Screening', voided: false, active: true}, true, {skipHydration: true});

            // 50 Individuals — mix of subject types, addresses, genders
            for (let i = 0; i < 50; i++) {
                const indUuid = uuid();
                uuids.individuals.push(indUuid);
                const isHousehold = i >= 45;
                proxy.create('Individual', {
                    uuid: indUuid,
                    name: `Person_${i}`,
                    firstName: `Person`,
                    lastName: `${i}`,
                    dateOfBirth: new Date(1990 + (i % 20), 0, 1),
                    dateOfBirthVerified: true,
                    registrationDate: new Date(2024, i % 12, 1),
                    voided: i === 49, // one voided
                    subjectType: {uuid: isHousehold ? uuids.subjectType2 : uuids.subjectType1},
                    gender: {uuid: uuids.gender1},
                    lowestAddressLevel: {uuid: [uuids.addr1, uuids.addr2, uuids.addr3][i % 3]},
                    observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"obs_${i}"}`}],
                }, true, {skipHydration: true});
            }

            // 30 ProgramEnrolments
            for (let i = 0; i < 30; i++) {
                const enrUuid = uuid();
                uuids.enrolments.push(enrUuid);
                proxy.create('ProgramEnrolment', {
                    uuid: enrUuid,
                    individual: {uuid: uuids.individuals[i]},
                    program: {uuid: uuids.program1},
                    enrolmentDateTime: new Date(2024, 3, 1),
                    programExitDateTime: i === 29 ? new Date(2025, 1, 1) : null, // one exited
                    voided: false,
                    observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"enrol_obs_${i}"}`}],
                }, true, {skipHydration: true});
            }

            // 60 ProgramEncounters
            const now = Date.now();
            const dayMs = 86400000;
            for (let i = 0; i < 60; i++) {
                const peUuid = uuid();
                uuids.programEncounters.push(peUuid);
                const isCompleted = i < 20;
                const isScheduled = i >= 20 && i < 40;
                proxy.create('ProgramEncounter', {
                    uuid: peUuid,
                    programEnrolment: {uuid: uuids.enrolments[i % 30]},
                    encounterType: {uuid: i % 2 === 0 ? uuids.encType1 : uuids.encType2},
                    earliestVisitDateTime: isScheduled ? new Date(now - dayMs * 2) : null,
                    maxVisitDateTime: isScheduled ? new Date(now + dayMs * 5) : null,
                    encounterDateTime: isCompleted ? new Date(now - dayMs * (i + 1)) : null,
                    voided: false,
                    observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"pe_obs_${i}"}`}],
                    name: `Visit_${i}`,
                }, true, {skipHydration: true});
            }

            // 10 General Encounters
            for (let i = 0; i < 10; i++) {
                const encUuid = uuid();
                uuids.encounters.push(encUuid);
                proxy.create('Encounter', {
                    uuid: encUuid,
                    individual: {uuid: uuids.individuals[i]},
                    encounterType: {uuid: uuids.encType2},
                    encounterDateTime: new Date(now - dayMs * i),
                    voided: false,
                    observations: [{concept: {uuid: uuid()}, valueJSON: `{"value":"enc_obs_${i}"}`}],
                    name: `GenVisit_${i}`,
                }, true, {skipHydration: true});
            }
        });
    }

    // ── Pattern 1: UUID lookup ──
    it('Pattern 1: UUID lookup and property access', () => {
        const results = proxy.objects('AddressLevel').filtered('uuid == $0', uuids.addr1);
        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Village_A');
    });

    // ── Pattern 2: Simple filtered + JS .filter() ──
    it('Pattern 2: filtered() then JS .filter() on FK property', () => {
        const results = proxy.objects('Individual')
            .filtered('voided == false')
            .filter(ind => ind.subjectType && ind.subjectType.name === 'Household');
        // Indices 45-48 are Household and non-voided (49 is voided)
        expect(results.length).toBe(4);
    });

    // ── Pattern 3: SUBQUERY on enrolments ──
    it('Pattern 3: SUBQUERY on enrolments (JS fallback)', () => {
        const results = proxy.objects('Individual').filtered(
            "SUBQUERY(enrolments, $enrolment, $enrolment.program.name = 'Child' and $enrolment.programExitDateTime = null and $enrolment.voided = false).@count > 0"
        );
        // 29 enrolments are active (index 29 is exited), pointing to individuals 0-28
        expect(results.length).toBe(29);
    });

    // ── Pattern 4: Nested SUBQUERY (3 levels) ──
    it('Pattern 4: Nested SUBQUERY — enrolments → encounters → observations', () => {
        const results = proxy.objects('Individual').filtered(
            "SUBQUERY(enrolments, $enrolment, $enrolment.voided = false and $enrolment.programExitDateTime = null and SUBQUERY($enrolment.encounters, $encounter, $encounter.encounterType.name = 'Monthly monitoring' and $encounter.voided = false).@count > 0).@count > 0"
        );
        // Encounters with encType1 (Monthly monitoring) are at even indices — mapped to enrolments 0,2,4,...
        expect(results.length).toBeGreaterThan(0);
    });

    // ── Pattern 5: Chained .filtered() calls ──
    it('Pattern 5: Chained .filtered() with dynamic queries', () => {
        const date = new Date();
        let results = proxy.objects('ProgramEncounter')
            .filtered('voided = false AND encounterDateTime = null');
        results = results.filtered('programEnrolment.voided = false');
        expect(results.length).toBeGreaterThan(0);
    });

    // ── Pattern 6: IN clause ──
    it('Pattern 6: IN clause with Realm syntax', () => {
        const results = proxy.objects('Individual').filtered(
            `voided = false AND lowestAddressLevel.uuid IN {"${uuids.addr1}", "${uuids.addr2}"}`
        );
        // ~2/3 of 49 non-voided individuals (addr1 and addr2 out of 3 addresses)
        expect(results.length).toBeGreaterThan(20);
        // None should have addr3
        const addr3Count = results.filter(ind => ind.lowestAddressLevel && ind.lowestAddressLevel.uuid === uuids.addr3);
        expect(addr3Count.length).toBe(0);
    });

    // ── Pattern 7: CONTAINS[c] on valueJSON inside SUBQUERY ──
    it('Pattern 7: CONTAINS[c] on observation valueJSON', () => {
        const results = proxy.objects('Individual').filtered(
            "voided = false AND SUBQUERY(observations, $observation, $observation.valueJSON contains 'obs_1').@count > 0"
        );
        // Should match obs_1, obs_10-19
        expect(results.length).toBeGreaterThan(0);
    });

    // ── Pattern 8: JS post-filter with entity methods ──
    it('Pattern 8: JS filter using entity property access', () => {
        const all = proxy.objects('Individual').filtered('voided = false');
        const withEnrolments = all.filter(ind => {
            const enrolments = ind.enrolments || [];
            return enrolments.length > 0;
        });
        expect(withEnrolments.length).toBeGreaterThan(0);
    });

    // ── Pattern 9: Deep property chains ──
    it('Pattern 9: Deep property chain access', () => {
        const results = proxy.objects('ProgramEncounter').filtered('voided = false');
        expect(results.length).toBeGreaterThan(0);
        const first = results[0];
        // Access 3-level deep chain: programEncounter → programEnrolment → individual → lowestAddressLevel
        const addr = first.programEnrolment && first.programEnrolment.individual && first.programEnrolment.individual.lowestAddressLevel;
        expect(addr).toBeDefined();
        expect(addr.name).toBeDefined();
    });

    // ── Pattern 10: Return count vs entity list ──
    it('Pattern 10: Count return pattern', () => {
        const individuals = proxy.objects('Individual').filtered('voided = false');
        const countResult = {
            primaryValue: individuals.length,
            linelistFunction: false,
        };
        expect(countResult.primaryValue).toBe(49);
        expect(typeof countResult.primaryValue).toBe('number');
    });

    // ── Pattern 11: .map() through results with FK access ──
    it('Pattern 11: .map() accessing FK properties', () => {
        const names = proxy.objects('Individual')
            .filtered('voided = false')
            .map(ind => ind.lowestAddressLevel && ind.lowestAddressLevel.name);
        expect(names.length).toBe(49);
        expect(names.filter(n => n === 'Village_A').length).toBeGreaterThan(0);
        expect(names.filter(n => n === 'Village_B').length).toBeGreaterThan(0);
    });

    // ── Pattern 12: Service-like facade query ──
    it('Pattern 12: Filtered query simulating service facade', () => {
        // Simulates IndividualServiceFacade.getSubjects(subjectTypeName)
        const results = proxy.objects('Individual')
            .filtered('voided = false')
            .filtered('subjectType.name = $0', 'Individual');
        expect(results.length).toBe(45); // 45 Individual type, 4 Household (non-voided)
    });

    // ── Pattern 13: Simple .length count ──
    it('Pattern 13: db.objects(schema).length for count', () => {
        const count = proxy.objects('AddressLevel').length;
        expect(count).toBe(3);
    });

    // ── Pattern 14: Mixed .filtered() + .filter() ──
    it('Pattern 14: SQL filter then JS filter with complex logic', () => {
        const results = proxy.objects('ProgramEncounter')
            .filtered("voided = false AND encounterType.name = $0", 'Monthly monitoring')
            .filter(enc => {
                // JS filter: check observation content
                const obs = enc.observations || [];
                return obs.length > 0;
            });
        expect(results.length).toBeGreaterThan(0);
        // All should have observations
        results.forEach(enc => {
            expect(enc.observations.length).toBeGreaterThan(0);
        });
    });

    // ── Bonus: Report card patterns from production ──

    it('Report card: filtered + JS filter + orderBy', () => {
        const results = proxy.objects('Individual')
            .filter(ind => ind.voided === false && ind.subjectType.name === 'Household');
        const sorted = _.orderBy(results, ind => ind.registrationDate, 'desc');
        expect(sorted.length).toBe(4);
    });

    it('Report card: ProgramEncounter with date filter + .map() to individual', () => {
        const date = new Date();
        const results = proxy.objects('ProgramEncounter')
            .filtered('programEnrolment.individual.voided = false AND programEnrolment.voided = false AND voided = false AND encounterDateTime = null AND earliestVisitDateTime <> null')
            .map(enc => enc.programEnrolment.individual);
        // Should return individual objects
        if (results.length > 0) {
            expect(results[0].uuid).toBeDefined();
        }
    });

    it('Report card: chained filtered with dynamic IN clause', () => {
        let query = proxy.objects('Individual')
            .filtered("subjectType.name = 'Individual' AND voided = false");

        const addressUuids = [uuids.addr1, uuids.addr2];
        const addressValueString = `{${addressUuids.map(u => `"${u}"`).join(', ')}}`;
        query = query.filtered(`lowestAddressLevel.uuid IN ${addressValueString}`);

        expect(query.length).toBeGreaterThan(0);
        // All results should be in addr1 or addr2
        for (let i = 0; i < query.length; i++) {
            const addr = query[i].lowestAddressLevel;
            expect([uuids.addr1, uuids.addr2]).toContain(addr.uuid);
        }
    });
});
