/**
 * Tests for SqliteProxy SQL-native query API:
 * execQuery, execCount, execCountEntities, execFindObservationValue
 *
 * Run: npx jest test/framework/db/SqliteProxySqlQueryTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../src/framework/db/SqliteProxy';

const nodeSqliteAdapter = require('../../helpers/nodeSqliteAdapter');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

describe('SqliteProxy SQL-native query API', () => {
    let rawDb, proxy;
    const uuids = {};

    beforeAll(() => {
        rawDb = nodeSqliteAdapter.open({name: `sql_query_${Date.now()}.db`});
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
            {schemaName: 'Program', depth: 1, skipLists: true},
            {schemaName: 'EncounterType', depth: 1, skipLists: true},
        ]);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    function seedData() {
        uuids.subjectType1 = uuid();
        uuids.gender1 = uuid();
        uuids.program1 = uuid();
        uuids.encType1 = uuid();
        uuids.individuals = [];
        uuids.enrolments = [];

        proxy.write(() => {
            proxy.create('SubjectType', {uuid: uuids.subjectType1, name: 'Individual', voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
            proxy.create('Gender', {uuid: uuids.gender1, name: 'Female', voided: false}, true, {skipHydration: true});
            proxy.create('Program', {uuid: uuids.program1, name: 'Child', voided: false, active: true, colour: '#000'}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: uuids.encType1, name: 'Monthly monitoring', voided: false, active: true}, true, {skipHydration: true});
            proxy.create('Concept', {uuid: 'weight-uuid', name: 'Weight', datatype: 'Numeric', voided: false}, true, {skipHydration: true});
            proxy.create('Concept', {uuid: 'hb-uuid', name: 'Hb', datatype: 'Numeric', voided: false}, true, {skipHydration: true});

            // 10 Individuals
            for (let i = 0; i < 10; i++) {
                const indUuid = uuid();
                uuids.individuals.push(indUuid);
                proxy.create('Individual', {
                    uuid: indUuid,
                    firstName: `Person_${i}`,
                    dateOfBirth: new Date(2000, 0, 1),
                    registrationDate: new Date(2024, 0, 1),
                    voided: i === 9, // one voided
                    subjectType: {uuid: uuids.subjectType1},
                    gender: {uuid: uuids.gender1},
                    observations: i < 5 ? [
                        {concept: {uuid: 'weight-uuid', name: 'Weight'}, valueJSON: `{"answer": ${50 + i}}`},
                    ] : [],
                }, true, {skipHydration: true});
            }

            // 5 ProgramEnrolments (first 5 individuals)
            for (let i = 0; i < 5; i++) {
                const enrUuid = uuid();
                uuids.enrolments.push(enrUuid);
                proxy.create('ProgramEnrolment', {
                    uuid: enrUuid,
                    individual: {uuid: uuids.individuals[i]},
                    program: {uuid: uuids.program1},
                    enrolmentDateTime: new Date(2024, 3, 1),
                    programExitDateTime: i === 4 ? new Date(2025, 1, 1) : null,
                    voided: false,
                    observations: [
                        {concept: {uuid: 'hb-uuid', name: 'Hb'}, valueJSON: `{"answer": ${8 + i}}`},
                    ],
                }, true, {skipHydration: true});
            }

            // 3 ProgramEncounters (for first 3 enrolments)
            for (let i = 0; i < 3; i++) {
                proxy.create('ProgramEncounter', {
                    uuid: uuid(),
                    programEnrolment: {uuid: uuids.enrolments[i]},
                    encounterType: {uuid: uuids.encType1},
                    encounterDateTime: new Date(2024, 6, 1),
                    voided: false,
                    observations: [],
                    name: `Visit_${i}`,
                }, true, {skipHydration: true});
            }
        });
    }

    // ──── execQuery ────

    describe('execQuery', () => {
        it('returns raw rows without hydration', () => {
            const rows = proxy.execQuery('SELECT uuid, first_name FROM individual WHERE voided = 0');
            expect(rows.length).toBe(9);
            // Raw rows have snake_case columns, not camelCase
            expect(rows[0].uuid).toBeDefined();
            expect(rows[0].first_name).toBeDefined();
            // No entity wrapping — plain objects (not entity class instances)
            expect(typeof rows[0]).toBe('object');
        });

        it('supports parameter binding', () => {
            const rows = proxy.execQuery('SELECT uuid FROM individual WHERE first_name = ?', ['Person_0']);
            expect(rows.length).toBe(1);
            expect(rows[0].uuid).toBe(uuids.individuals[0]);
        });

        it('returns empty array for no matches', () => {
            const rows = proxy.execQuery("SELECT uuid FROM individual WHERE first_name = 'nonexistent'");
            expect(rows).toEqual([]);
        });

        it('throws on INSERT statement', () => {
            expect(() => proxy.execQuery("INSERT INTO individual (uuid) VALUES ('x')"))
                .toThrow('Only SELECT statements are allowed');
        });

        it('throws on UPDATE statement', () => {
            expect(() => proxy.execQuery("UPDATE individual SET voided = 1"))
                .toThrow('Only SELECT statements are allowed');
        });

        it('throws on DELETE statement', () => {
            expect(() => proxy.execQuery("DELETE FROM individual"))
                .toThrow('Only SELECT statements are allowed');
        });

        it('supports JOIN queries', () => {
            const rows = proxy.execQuery(`
                SELECT DISTINCT i.uuid FROM individual i
                JOIN program_enrolment pe ON pe.individual_uuid = i.uuid
                JOIN program p ON p.uuid = pe.program_uuid
                WHERE p.name = ? AND pe.voided = 0
            `, ['Child']);
            expect(rows.length).toBe(5);
        });
    });

    // ──── execCount ────

    describe('execCount', () => {
        it('returns count as a number', () => {
            const count = proxy.execCount('SELECT COUNT(*) FROM individual WHERE voided = 0');
            expect(count).toBe(9);
            expect(typeof count).toBe('number');
        });

        it('returns 0 for no matches', () => {
            const count = proxy.execCount("SELECT COUNT(*) FROM individual WHERE first_name = 'nonexistent'");
            expect(count).toBe(0);
        });

        it('works with aliased count column', () => {
            const count = proxy.execCount('SELECT COUNT(*) AS cnt FROM individual WHERE voided = 0');
            expect(count).toBe(9);
        });

        it('works with complex JOIN count', () => {
            const count = proxy.execCount(`
                SELECT COUNT(DISTINCT pe.individual_uuid)
                FROM program_enrolment pe
                JOIN program p ON p.uuid = pe.program_uuid
                WHERE p.name = ? AND pe.voided = 0 AND pe.program_exit_date_time IS NULL
            `, ['Child']);
            expect(count).toBe(4); // 5 enrolments, 1 exited
        });
    });

    // ──── execCountEntities ────

    describe('execCountEntities', () => {
        it('counts all entities in a schema', () => {
            const count = proxy.execCountEntities('Individual');
            expect(count).toBe(10);
        });

        it('counts with WHERE clause', () => {
            const count = proxy.execCountEntities('Individual', 'voided = 0');
            expect(count).toBe(9);
        });

        it('counts with parameterized WHERE', () => {
            const count = proxy.execCountEntities('Individual', 'first_name = ?', ['Person_0']);
            expect(count).toBe(1);
        });

        it('translates schema name to table name', () => {
            const count = proxy.execCountEntities('ProgramEnrolment');
            expect(count).toBe(5);
        });

        it('throws for unknown schema', () => {
            expect(() => proxy.execCountEntities('NonExistentSchema'))
                .toThrow('No table metadata');
        });
    });

    // ──── execFindObservationValue ────

    describe('execFindObservationValue', () => {
        it('finds numeric observation by concept name', () => {
            const value = proxy.execFindObservationValue('Individual', uuids.individuals[0], 'Weight');
            expect(value).toBe(50);
        });

        it('finds numeric observation by concept UUID', () => {
            const value = proxy.execFindObservationValue('Individual', uuids.individuals[1], 'weight-uuid');
            expect(value).toBe(51);
        });

        it('returns null for entity without the observation', () => {
            const value = proxy.execFindObservationValue('Individual', uuids.individuals[5], 'Weight');
            expect(value).toBeNull();
        });

        it('returns null for non-existent entity', () => {
            const value = proxy.execFindObservationValue('Individual', 'non-existent-uuid', 'Weight');
            expect(value).toBeNull();
        });

        it('works on ProgramEnrolment observations', () => {
            const value = proxy.execFindObservationValue('ProgramEnrolment', uuids.enrolments[0], 'Hb');
            expect(value).toBe(8);
        });

        it('throws for unknown schema', () => {
            expect(() => proxy.execFindObservationValue('FakeSchema', 'uuid', 'concept'))
                .toThrow('No table');
        });
    });

    // ──── execCount matches hydrated query ────

    describe('count parity with hydrated queries', () => {
        it('execCount matches objects().filtered().length for non-voided individuals', () => {
            const execCount = proxy.execCount('SELECT COUNT(*) FROM individual WHERE voided = 0');
            const hydratedCount = proxy.objects('Individual').filtered('voided = false').length;
            expect(execCount).toBe(hydratedCount);
        });

        it('execCount matches SUBQUERY-based filtered count', () => {
            const execCount = proxy.execCount(`
                SELECT COUNT(DISTINCT pe.individual_uuid)
                FROM program_enrolment pe
                JOIN program p ON p.uuid = pe.program_uuid
                WHERE p.name = 'Child' AND pe.voided = 0 AND pe.program_exit_date_time IS NULL
            `);
            const hydratedCount = proxy.objects('Individual').filtered(
                "SUBQUERY(enrolments, $e, $e.program.name = 'Child' AND $e.programExitDateTime = null AND $e.voided = false).@count > 0"
            ).length;
            expect(execCount).toBe(hydratedCount);
        });
    });
});
