/**
 * Data round-trip for every parent→child list relationship flagged by the static
 * sweep (ListPropertyParentFkSweepTest). Persists a parent and its children
 * through the real SqliteProxy the way sync does, reloads the parent, and asserts
 * the child list comes back. This is the empirical counterpart to the static
 * sweep — it catches role-confusion (Concept.answers) that the static check can't.
 *
 * Runs under the `integration` jest project, where @op-engineering/op-sqlite is
 * rewritten to a real better-sqlite3 DB:
 *   npx jest --selectProjects integration --testPathPattern ListPropertyRoundtripTest
 *
 * Tracking issue: avniproject/avni-client#1955. Each case is its own assertion so
 * fixes flip them green one at a time. Expected RED until each relationship's
 * parent linkage is persisted in SQLite.
 */

import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';

let rawDb, proxy;

const save = (rows) => proxy.write(() => {
    for (const [schema, obj] of rows) {
        proxy.create(schema, obj, true, {skipHydration: true});
    }
});

// Each case persists a parent + its children the way sync would, then exposes how
// to read the list back off the reloaded parent. `expected` is the correct count;
// today every case resolves 0 (or throws), which is the bug.
const CASES = [
    {
        name: 'Concept.answers (coded form options) — role-confused single FK',
        parentSchema: 'Concept',
        getList: (c) => c.getAnswers(),
        expected: 2,
        setup: () => {
            const q = 'lp-concept-q', a1 = 'lp-ans-1', a2 = 'lp-ans-2';
            save([
                ['Concept', {uuid: a1, name: 'Yes', datatype: 'NA', voided: false}],
                ['Concept', {uuid: a2, name: 'No', datatype: 'NA', voided: false}],
                ['Concept', {uuid: q, name: 'Coded Q', datatype: 'Coded', voided: false,
                    answers: [
                        {uuid: 'lp-ca-1', concept: {uuid: a1}, answerOrder: 1, voided: false},
                        {uuid: 'lp-ca-2', concept: {uuid: a2}, answerOrder: 2, voided: false},
                    ]}],
                // sync writes each ConceptAnswer as its own entity; its only link is
                // to the answer concept — the parent question is not persisted.
                ['ConceptAnswer', {uuid: 'lp-ca-1', concept: {uuid: a1}, answerOrder: 1, abnormal: false, unique: false, voided: false}],
                ['ConceptAnswer', {uuid: 'lp-ca-2', concept: {uuid: a2}, answerOrder: 2, abnormal: false, unique: false, voided: false}],
            ]);
            return q;
        },
    },
    {
        name: 'Individual.approvalStatuses — generic entity_uuid link, no typed FK',
        parentSchema: 'Individual',
        getList: (e) => e.approvalStatuses,
        expected: 1,
        setup: () => {
            const ind = 'lp-ind-1';
            save([
                ['Individual', {uuid: ind, firstName: 'Test', voided: false}],
                ['EntityApprovalStatus', {uuid: 'lp-eas-1', entityUUID: ind, entityType: 'Subject', voided: false}],
            ]);
            return ind;
        },
    },
    {
        name: 'ReportCard.standardReportCardInputSubjectTypes — many-to-many, no join table',
        parentSchema: 'ReportCard',
        getList: (e) => e.standardReportCardInputSubjectTypes,
        expected: 1,
        setup: () => {
            const rc = 'lp-rc-1', st = 'lp-st-1';
            save([
                ['SubjectType', {uuid: st, name: 'Person', voided: false}],
                ['ReportCard', {uuid: rc, name: 'Card', voided: false, standardReportCardInputSubjectTypes: [{uuid: st}]}],
            ]);
            return rc;
        },
    },
    {
        name: 'TaskType.metadataSearchFields — many-to-many to Concept, no join table',
        parentSchema: 'TaskType',
        getList: (e) => e.metadataSearchFields,
        expected: 1,
        setup: () => {
            const tt = 'lp-tt-1', c = 'lp-msf-c1';
            save([
                ['Concept', {uuid: c, name: 'Field', datatype: 'Text', voided: false}],
                ['TaskType', {uuid: tt, name: 'T', type: 'Call', voided: false, metadataSearchFields: [{uuid: c}]}],
            ]);
            return tt;
        },
    },
    {
        name: 'AttendanceRecord.reasonConceptUUIDs — primitive string[] list',
        parentSchema: 'AttendanceRecord',
        getList: (e) => e.reasonConceptUUIDs,
        expected: 2,
        setup: () => {
            const ar = 'lp-ar-1';
            save([
                ['AttendanceRecord', {uuid: ar, reasonConceptUUIDs: ['lp-r-1', 'lp-r-2'], voided: false}],
            ]);
            return ar;
        },
    },
];

describe('parent→child list round-trip via SqliteProxy (#1955)', () => {
    beforeAll(() => {
        rawDb = open({name: `list_roundtrip_${Date.now()}.db`});
        const emc = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(emc);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(emc);

        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);

        proxy = new SqliteProxy(rawDb, emc, tableMetaMap, realmSchemaMap);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    it.each(CASES)('round-trips $name', (testCase) => {
        const parentUuid = testCase.setup();
        const reloaded = proxy.objectForPrimaryKey(testCase.parentSchema, parentUuid);
        expect(reloaded).toBeTruthy();
        const list = testCase.getList(reloaded) || [];
        expect(list.length).toBe(testCase.expected);
    });

    // ConceptAnswer is synced as its own entity; the parent Concept's answers
    // column is populated only when the parent is re-saved during sync association
    // (Concept.associateChild), as a partial {uuid, answers} upsert. This mirrors
    // that write order — concept saved first WITHOUT answers, then the partial
    // parent re-save — to guard against the parent association being skipped.
    it('populates Concept.answers via a partial parent re-save without clobbering other columns', async () => {
        const q = 'sync-concept-q', a1 = 'sync-ans-1';
        await proxy.bulkCreate('Concept', [
            {uuid: q, name: 'Coded Q', datatype: 'Coded', voided: false},
            {uuid: a1, name: 'Yes', datatype: 'NA', voided: false},
        ]);
        await proxy.bulkCreate('ConceptAnswer', [
            {uuid: 'sync-ca-1', concept: {uuid: a1}, answerOrder: 1, abnormal: false, unique: false, voided: false},
        ]);
        // The association write: partial parent, only uuid + answers present.
        await proxy.bulkCreate('Concept', [{uuid: q, answers: [{uuid: 'sync-ca-1'}]}]);

        const reloaded = proxy.objectForPrimaryKey('Concept', q);
        expect(reloaded.datatype).toBe('Coded');      // COALESCE upsert preserved it
        expect(reloaded.name).toBe('Coded Q');
        expect(reloaded.getAnswers().length).toBe(1); // answers populated
    });

    // _persistAllBatch's cross-page fix mutates the reference-cache entry after
    // writing the parent so a later page accumulates onto it. That relies on
    // getCachedEntity exposing a view whose `.that` is the cached object itself —
    // mutations must survive to the next read. Guard that contract.
    it('getCachedEntity mutations persist to the reference cache across reads', async () => {
        const q = 'cache-concept-q';
        await proxy.bulkCreate('Concept', [{uuid: q, name: 'Q', datatype: 'Coded', voided: false}]);
        proxy.buildReferenceCache([{schemaName: 'Concept', depth: 2, skipLists: false}]);

        const first = proxy.getCachedEntity('Concept', q);
        expect(first).toBeTruthy();
        first.that.answers = [{uuid: 'ca-x'}, {uuid: 'ca-y'}]; // mirrors the cache refresh

        const second = proxy.getCachedEntity('Concept', q);
        expect(second.that.answers.map(a => a.uuid)).toEqual(['ca-x', 'ca-y']);

        proxy.clearReferenceCache();
    });

    // A uuid in the answers array with no concept_answer row hydrates to a bare
    // {uuid} stub; without filtering, Concept.getAnswers (reading answer.concept)
    // would throw. The hydrate guard drops unresolved references.
    it('drops unresolved answer references so getAnswers does not throw', async () => {
        const q = 'guard-concept-q';
        await proxy.bulkCreate('Concept', [{uuid: q, name: 'Q', datatype: 'Coded', voided: false}]);
        await proxy.bulkCreate('Concept', [{uuid: q, answers: [{uuid: 'missing-ca'}]}]);

        const reloaded = proxy.objectForPrimaryKey('Concept', q);
        expect(() => reloaded.getAnswers()).not.toThrow();
        expect(reloaded.getAnswers().length).toBe(0);
    });
});
