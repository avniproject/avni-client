/**
 * Opening a subject list from a dashboard card walked encounter -> enrolment -> individual and
 * eagerly expanded every list it passed, so each row paid for the enrolment's whole encounter
 * history and the subject's. Against the real schema, not a hand-built map.
 *
 * Tracking issue: avniproject/avni-client#2105.
 *   npx jest --selectProjects integration --testPathPattern SubjectListHydrationTest
 */

import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';

describe('subject list hydration: rows load what they display (#2105)', () => {
    let rawDb, proxy;

    const IND = 'sl-ind-1', ENL = 'sl-enl-1', PROG = 'sl-prog-1', ET = 'sl-et-1';
    const ROW_ENCOUNTER = 'sl-penc-1';

    beforeAll(async () => {
        rawDb = open({name: `subject_list_hydration_${Date.now()}.db`});
        const emc = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(emc);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(emc);
        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, emc, tableMetaMap, realmSchemaMap);

        await proxy.bulkCreate('Program', [{uuid: PROG, name: 'Mother', colour: '#ff0000', voided: false}]);
        await proxy.bulkCreate('EncounterType', [{uuid: ET, name: 'ANC', voided: false}]);
        await proxy.bulkCreate('Individual', [{uuid: IND, firstName: 'Kavita', voided: false}]);
        await proxy.bulkCreate('ProgramEnrolment', [
            {uuid: ENL, individual: {uuid: IND}, program: {uuid: PROG}, voided: false},
            {uuid: 'sl-enl-2', individual: {uuid: IND}, program: {uuid: PROG}, voided: false},
        ]);
        // The row the card shows, plus the visit history hanging off the same enrolment that it
        // does not show. That history is what made each row expensive.
        await proxy.bulkCreate('ProgramEncounter', [
            {uuid: ROW_ENCOUNTER, name: 'ANC 1', programEnrolment: {uuid: ENL}, encounterType: {uuid: ET}, voided: false},
            {uuid: 'sl-penc-2', name: 'ANC 2', programEnrolment: {uuid: ENL}, encounterType: {uuid: ET}, voided: false},
            {uuid: 'sl-penc-3', name: 'ANC 3', programEnrolment: {uuid: ENL}, encounterType: {uuid: ET}, voided: false},
        ]);
        await proxy.bulkCreate('Encounter', [
            {uuid: 'sl-genc-1', individual: {uuid: IND}, encounterType: {uuid: ET}, voided: false},
        ]);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    function rowFor(hydrationOptions) {
        return proxy.objects('ProgramEncounter')
            .withHydration(hydrationOptions)
            .filtered(`uuid = "${ROW_ENCOUNTER}"`)[0];
    }

    // A prefetched list is a plain data property; a deferred one is an accessor.
    function isPrefetched(entity, propName) {
        const target = entity.that || entity;
        return !Object.getOwnPropertyDescriptor(target, propName).get;
    }

    // What a scheduled or overdue row renders: subject name and address, program and visit name.
    // Those cards hide enrolment badges, so no list is read at all.
    describe('scheduled and overdue rows', () => {
        const SUBJECT_VIA_ENROLMENT = {skipLists: true, depth: 2};

        it('resolves everything the row displays', () => {
            const row = rowFor(SUBJECT_VIA_ENROLMENT);

            expect(row.programEnrolment.individual.firstName).toBe('Kavita');
            expect(row.programEnrolment.program.name).toBe('Mother');
            expect(row.encounterType.name).toBe('ANC');
        });

        it('does not expand the enrolment history behind the row', () => {
            const row = rowFor(SUBJECT_VIA_ENROLMENT);

            expect(isPrefetched(row.programEnrolment, 'encounters')).toBe(false);
        });

        it('does not expand the subject lists behind the row', () => {
            const row = rowFor(SUBJECT_VIA_ENROLMENT);
            const individual = row.programEnrolment.individual;

            expect(isPrefetched(individual, 'enrolments')).toBe(false);
            expect(isPrefetched(individual, 'encounters')).toBe(false);
        });

        it('still resolves a deferred list correctly when something reads it', () => {
            const row = rowFor(SUBJECT_VIA_ENROLMENT);

            expect(Array.from(row.programEnrolment.encounters, e => e.uuid).sort())
                .toEqual([ROW_ENCOUNTER, 'sl-penc-2', 'sl-penc-3']);
            expect(Array.from(row.programEnrolment.individual.enrolments, e => e.uuid).sort())
                .toEqual([ENL, 'sl-enl-2']);
        });
    });

    // The recent-visits card shows enrolment badges, so that one list is opted back in.
    describe('rows that show enrolment badges', () => {
        const WITH_BADGES = {
            skipLists: true,
            depth: 3,
            listsToInclude: new Set(['Individual.enrolments'])
        };

        it('prefetches the badge list with its programs resolved', () => {
            const individual = rowFor(WITH_BADGES).programEnrolment.individual;

            expect(isPrefetched(individual, 'enrolments')).toBe(true);
            expect(Array.from(individual.enrolments, e => e.program.name)).toEqual(['Mother', 'Mother']);
        });

        // Individual.encounters and ProgramEnrolment.encounters share a property name; a bare
        // "enrolments" key must not reach anything but the subject's own list.
        it('leaves every other list behind the row deferred', () => {
            const row = rowFor(WITH_BADGES);

            expect(isPrefetched(row.programEnrolment, 'encounters')).toBe(false);
            expect(isPrefetched(row.programEnrolment.individual, 'encounters')).toBe(false);
        });
    });
});
