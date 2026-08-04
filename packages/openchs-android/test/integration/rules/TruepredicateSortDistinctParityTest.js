/**
 * Parity for the P-A family: TRUEPREDICATE sort(...) [Distinct(...)] on real SQLite.
 * Seeds encounters (multiple per individual) so "latest encounter per individual" is
 * unambiguous, and a bare-distinct case sensitive to insertion order.
 *
 * Run: npx jest test/integration/rules/TruepredicateSortDistinctParityTest.js --verbose
 */
import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../src/framework/db/SqliteProxy';
import {open} from '@op-engineering/op-sqlite';

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

describe('TRUEPREDICATE sort/Distinct parity on SQLite', () => {
    let rawDb, proxy;
    const ids = {ind: [], enr: [], enc: []};

    beforeAll(() => {
        rawDb = open({name: `tp_parity_${Date.now()}.db`});
        const cfg = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(cfg);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(cfg);
        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, cfg, tableMetaMap, realmSchemaMap);

        const program = uuid(), encType = uuid(), subjectType = uuid();
        proxy.write(() => {
            proxy.create('SubjectType', {uuid: subjectType, name: 'Person', voided: false, active: true, type: 'Person'}, true, {skipHydration: true});
            proxy.create('Program', {uuid: program, name: 'Child', voided: false, active: true, colour: '#000'}, true, {skipHydration: true});
            proxy.create('EncounterType', {uuid: encType, name: 'Monthly', voided: false, active: true}, true, {skipHydration: true});
            // 3 individuals, each with 1 enrolment and 3 program encounters at increasing dates
            for (let i = 0; i < 3; i++) {
                const indU = uuid(); ids.ind.push(indU);
                proxy.create('Individual', {uuid: indU, name: `P${i}`, firstName: 'P', lastName: `${i}`, voided: false, subjectType: {uuid: subjectType}}, true, {skipHydration: true});
                const enrU = uuid(); ids.enr.push(enrU);
                proxy.create('ProgramEnrolment', {uuid: enrU, individual: {uuid: indU}, program: {uuid: program}, enrolmentDateTime: new Date(2024, 0, 1 + i), voided: false}, true, {skipHydration: true});
                for (let j = 0; j < 3; j++) {
                    const encU = uuid(); ids.enc.push({u: encU, ind: indU, day: j});
                    proxy.create('ProgramEncounter', {uuid: encU, programEnrolment: {uuid: enrU}, encounterType: {uuid: encType}, encounterDateTime: new Date(2024, 5, 1 + j), voided: false, name: `E${i}_${j}`}, true, {skipHydration: true});
                }
            }
        });
        proxy.buildReferenceCache([
            {schemaName: 'SubjectType', depth: 1, skipLists: true},
            {schemaName: 'Program', depth: 1, skipLists: true},
            {schemaName: 'EncounterType', depth: 1, skipLists: true},
        ]);
    });

    afterAll(() => { if (rawDb) rawDb.close(); });

    it('sort + Distinct → one (latest) encounter per individual', () => {
        const results = proxy.objects('ProgramEncounter').filtered(
            'TRUEPREDICATE sort(programEnrolment.individual.uuid asc , encounterDateTime desc) Distinct(programEnrolment.individual.uuid)'
        );
        expect(results.length).toBe(3); // one per individual
        // Each winner is the latest encounter (day index 2) for its individual
        results.forEach(enc => expect(enc.encounterDateTime.getTime()).toBe(new Date(2024, 5, 3).getTime()));
    });

    it('sort only → full set ordered by encounterDateTime desc', () => {
        const results = proxy.objects('ProgramEncounter').filtered('TRUEPREDICATE sort(encounterDateTime desc)');
        expect(results.length).toBe(9);
        for (let i = 1; i < results.length; i++) {
            expect(results[i - 1].encounterDateTime.getTime()).toBeGreaterThanOrEqual(results[i].encounterDateTime.getTime());
        }
    });

    it('bare Distinct → first-in-insertion-order per key', () => {
        const results = proxy.objects('ProgramEncounter').filtered('TRUEPREDICATE DISTINCT(name)');
        expect(results.length).toBe(9); // names are all distinct here
        const enrol = proxy.objects('ProgramEncounter').filtered('TRUEPREDICATE DISTINCT(programEnrolment.uuid)');
        // rowid tie-break must keep the FIRST-inserted encounter per enrolment (j=0)
        expect(enrol.length).toBe(3);
        enrol.forEach(enc => {
            expect(enc.name.endsWith('_0')).toBe(true);
            expect(enc.encounterDateTime.getTime()).toBe(new Date(2024, 5, 1).getTime());
        });
    });

    it('count() over a windowed distinct returns the deduped count', () => {
        const c = proxy.objects('ProgramEncounter')
            .filtered('TRUEPREDICATE DISTINCT(programEnrolment.uuid)').count();
        expect(c).toBe(3);
    });

    it('min() over a windowed distinct aggregates the deduped set, not the full table', () => {
        const latestPerEnrol = proxy.objects('ProgramEncounter')
            .filtered('TRUEPREDICATE sort(encounterDateTime desc) Distinct(programEnrolment.uuid)');
        expect(latestPerEnrol.min('encounterDateTime')).toBe(new Date(2024, 5, 3).getTime());
    });
});
