/**
 * Regression test for the windowed-DISTINCT outer ORDER BY bug: an outer
 * .sorted() after a `TRUEPREDICATE ... Distinct(...)` filter must not
 * reference a column that only exists inside the subquery scope (t0 columns
 * or joined-alias dot-paths), or SQLite throws "no such column".
 *
 * Run: npx jest --selectProjects integration test/integration/framework/db/WindowedDistinctOuterSortTest.js --verbose
 */

import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';
import {open} from '@op-engineering/op-sqlite';

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

describe('Windowed DISTINCT outer ORDER BY on real SQLite', () => {
    let rawDb, proxy;
    const uuids = {};

    beforeAll(() => {
        rawDb = open({name: `windowed_distinct_outer_sort_${Date.now()}.db`});
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

            // 3 individuals, 3 enrolments with distinct enrolmentDateTime, 2 encounters each
            // with distinct encounterDateTime.
            //   Enrolment A: enrolmentDateTime day1, encounters day10, day11 (earliest=day10)
            //   Enrolment B: enrolmentDateTime day2, encounters day20, day21 (earliest=day20)
            //   Enrolment C: enrolmentDateTime day3, encounters day5,  day6  (earliest=day5)
            const enrolmentPlans = [
                {enrolDay: 1, encounterDays: [10, 11]},
                {enrolDay: 2, encounterDays: [20, 21]},
                {enrolDay: 3, encounterDays: [5, 6]},
            ];

            enrolmentPlans.forEach((plan, idx) => {
                const indUuid = uuid();
                uuids.individuals.push(indUuid);
                proxy.create('Individual', {
                    uuid: indUuid,
                    name: `Person_${idx}`,
                    firstName: 'Person',
                    lastName: `${idx}`,
                    dateOfBirth: new Date(1990, 0, 1),
                    dateOfBirthVerified: true,
                    registrationDate: new Date(2024, 0, 1),
                    voided: false,
                    subjectType: {uuid: uuids.subjectType1},
                    gender: {uuid: uuids.gender1},
                }, true, {skipHydration: true});

                const enrUuid = uuid();
                uuids.enrolments.push(enrUuid);
                proxy.create('ProgramEnrolment', {
                    uuid: enrUuid,
                    individual: {uuid: indUuid},
                    program: {uuid: uuids.program1},
                    enrolmentDateTime: new Date(2024, 0, plan.enrolDay),
                    voided: false,
                }, true, {skipHydration: true});

                plan.encounterDays.forEach(day => {
                    proxy.create('ProgramEncounter', {
                        uuid: uuid(),
                        programEnrolment: {uuid: enrUuid},
                        encounterType: {uuid: uuids.encType1},
                        encounterDateTime: new Date(2024, 1, day),
                        voided: false,
                        name: `Visit_${idx}_${day}`,
                    }, true, {skipHydration: true});
                });
            });
        });
    }

    it('outer .sorted() on a t0 column after windowed distinct executes and orders correctly', () => {
        const results = proxy.objects('ProgramEncounter')
            .filtered('TRUEPREDICATE sort(encounterDateTime asc) Distinct(programEnrolment.uuid)')
            .sorted('encounterDateTime', true);

        // One row per enrolment (the earliest encounter, per the inline sort/partition order)
        expect(results.length).toBe(3);

        // Outer sort is descending by encounterDateTime: enrolment B's earliest (day20) first,
        // then A's (day10), then C's (day5).
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].encounterDateTime.getTime())
                .toBeGreaterThanOrEqual(results[i].encounterDateTime.getTime());
        }
        expect(results[0].encounterDateTime.getDate()).toBe(20);
        expect(results[1].encounterDateTime.getDate()).toBe(10);
        expect(results[2].encounterDateTime.getDate()).toBe(5);
    });

    it('outer .sorted() on a joined dot-path column after windowed distinct executes', () => {
        const results = proxy.objects('ProgramEncounter')
            .filtered('TRUEPREDICATE DISTINCT(programEnrolment.uuid)')
            .sorted([['programEnrolment.enrolmentDateTime', false], ['encounterDateTime', true]]);

        // Must not throw; one row per enrolment.
        expect(results.length).toBe(3);
        expect(results.map(r => r.uuid).every(Boolean)).toBe(true);

        // Ordered ascending by enrolmentDateTime: enrolment A (day1), B (day2), C (day3).
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].programEnrolment.enrolmentDateTime.getTime())
                .toBeLessThanOrEqual(results[i].programEnrolment.enrolmentDateTime.getTime());
        }
        expect(results[0].programEnrolment.enrolmentDateTime.getDate()).toBe(1);
        expect(results[1].programEnrolment.enrolmentDateTime.getDate()).toBe(2);
        expect(results[2].programEnrolment.enrolmentDateTime.getDate()).toBe(3);
    });
});
