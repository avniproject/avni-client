/**
 * A shallow query that keeps one list (the total card keeps Individual.enrolments for its badge
 * strip) must fetch that list in batches, not with one query per row. Before this, the batch
 * preload ran only for fully deep queries, so the total card issued a query per subject in the
 * catchment — tens of thousands at JSCS scale, on the JS thread.
 *
 * Tracking issue: avniproject/avni-client#2105.
 *   npx jest --selectProjects integration --testPathPattern IncludedListBatchPreloadTest
 */
import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';

const SUBJECTS = 50;
const BADGES = {skipLists: true, depth: 1, listsToInclude: new Set(['Individual.enrolments'])};

describe('included lists are batch-preloaded (#2105)', () => {
    let rawDb, proxy, statements;

    beforeAll(async () => {
        rawDb = open({name: `included_list_preload_${Date.now()}.db`});
        const emc = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(emc);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(emc);
        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, emc, tableMetaMap, realmSchemaMap);

        const ids = [...Array(SUBJECTS).keys()];
        await proxy.bulkCreate('Program', [{uuid: 'pr', name: 'Mother', colour: '#000', voided: false}]);
        await proxy.bulkCreate('EncounterType', [{uuid: 'et', name: 'ANC', voided: false}]);
        await proxy.bulkCreate('Individual', ids.map(i => ({uuid: `ind-${i}`, firstName: `S${i}`, voided: false})));
        await proxy.bulkCreate('ProgramEnrolment', ids.map(i => ({uuid: `enl-${i}`, individual: {uuid: `ind-${i}`}, program: {uuid: 'pr'}, voided: false})));
        await proxy.bulkCreate('Encounter', ids.map(i => ({uuid: `enc-${i}`, individual: {uuid: `ind-${i}`}, encounterType: {uuid: 'et'}, voided: false})));

        // Record every statement the proxy sends from here on.
        const executeSync = rawDb.executeSync.bind(rawDb);
        rawDb.executeSync = (sql, params) => {
            if (statements) statements.push(sql);
            return executeSync(sql, params);
        };
    });

    afterAll(() => rawDb && rawDb.close());

    const loadSubjects = () => {
        statements = [];
        const subjects = [...proxy.objects('Individual').withHydration(BADGES).filtered('voided = false')];
        const sent = statements;
        statements = null;
        return {subjects, sent};
    };
    const isPrefetched = (entity, propName) => !Object.getOwnPropertyDescriptor(entity.that || entity, propName).get;

    it('fetches the kept list without a query per row', () => {
        const {subjects, sent} = loadSubjects();
        const perRow = sent.filter(sql => /FROM program_enrolment WHERE "individual_uuid" = \?/.test(sql));

        expect(subjects).toHaveLength(SUBJECTS);
        expect(perRow).toHaveLength(0);
    });

    it('still gives every row its own enrolments', () => {
        const {subjects} = loadSubjects();

        for (const subject of subjects) {
            expect(isPrefetched(subject, 'enrolments')).toBe(true);
            expect([...subject.enrolments].map(enl => enl.uuid)).toEqual([`enl-${subject.uuid.slice(4)}`]);
        }
    });

    it('does not preload the lists the query skips', () => {
        const {subjects, sent} = loadSubjects();

        expect(sent.some(sql => /FROM encounter WHERE/.test(sql))).toBe(false);
        expect(isPrefetched(subjects[0], 'encounters')).toBe(false);
    });
});
