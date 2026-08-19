/**
 * #1977 — row-sequence parity for TRUEPREDICATE sort/Distinct against real Realm.
 *
 * Expectations are Realm 12.14.2's own answers, derived by running the same queries
 * against a live Realm in plain node (jest mocks realm, so the oracle cannot run here).
 * They are NOT read off the implementation: re-derive from Realm before changing any of them.
 *
 * Fixture is built to DISCRIMINATE, which the existing suites do not:
 *   - partition-key order (xxx < yyy < zzz) is the REVERSE of rowid order, so a missing
 *     outer ORDER BY leaks the window's partition order and fails here;
 *   - level values are tied in pairs, so a missing rowid tiebreaker is detectable.
 * Verified to fail on 91a7e92 (4 of 6) and pass on 90f5fad.
 *
 * The limit(1) case is the one that matters in production: before the fix it returned a
 * DIFFERENT ROW, not merely a different order — the GroupDashboard reorder after migration.
 *
 * Run: npx jest --selectProjects integration --testPathPattern RealmOracleSortDistinctParity
 */
import {EntityMappingConfig} from 'openchs-models';
import SchemaGenerator from '../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../src/framework/db/SqliteProxy';
import {open} from '@op-engineering/op-sqlite';

const ROWS = [
    {id: 1, uuid: 'bbbbbbbb-0000-4000-8000-000000000001', typeUuid: 'zzz', level: 5},
    {id: 2, uuid: 'bbbbbbbb-0000-4000-8000-000000000002', typeUuid: 'yyy', level: 5},
    {id: 3, uuid: 'bbbbbbbb-0000-4000-8000-000000000003', typeUuid: 'xxx', level: 9},
    {id: 4, uuid: 'bbbbbbbb-0000-4000-8000-000000000004', typeUuid: 'zzz', level: 9},
];
const byUuid = Object.fromEntries(ROWS.map(r => [r.uuid, r.id]));

const REALM = {
    bareDistinct:       [1, 2, 3],
    bareDistinctLimit1: [1],
    distinctThenSort:   [1, 2, 3],
    sortThenDistinct:   [1, 2, 3],
    longAscending:      [1, 2, 3, 4],
    longDescending:     [3, 4, 1, 2],
    tiedSortKey:        [1, 2, 3, 4],
};

describe('#1977 parity vs live Realm oracle (discriminating fixture)', () => {
    let rawDb, proxy;
    beforeAll(async () => {
        rawDb = open({name: `oracle_parity_b_${Date.now()}.db`});
        const emc = EntityMappingConfig.getInstance();
        const tableMetaMap = SchemaGenerator.generateAll(emc);
        const realmSchemaMap = SchemaGenerator.buildRealmSchemaMap(emc);
        rawDb.executeSync('PRAGMA foreign_keys = OFF');
        for (const sql of SchemaGenerator.generateCreateTableStatements(tableMetaMap)) rawDb.executeSync(sql);
        for (const sql of SchemaGenerator.generateIndexStatements(tableMetaMap)) rawDb.executeSync(sql);
        proxy = new SqliteProxy(rawDb, emc, tableMetaMap, realmSchemaMap);
        await proxy.bulkCreate('AddressLevel', ROWS.map(r =>
            ({uuid: r.uuid, typeUuid: r.typeUuid, level: r.level, title: `t${r.id}`, voided: false})));
    });
    afterAll(() => { if (rawDb) rawDb.close(); });

    const ids = res => Array.from(res).map(r => byUuid[r.uuid]);
    const q = s => proxy.objects('AddressLevel').filtered(s);

    it('FIX-1 bare Distinct keeps rowid order, not partition order', () => {
        expect(ids(q('TRUEPREDICATE DISTINCT(typeUuid)'))).toEqual(REALM.bareDistinct);
    });
    it('FIX-1b bare Distinct + limit(1) returns the same ROW as Realm', () => {
        expect(ids(q('TRUEPREDICATE DISTINCT(typeUuid)')).slice(0, 1)).toEqual(REALM.bareDistinctLimit1);
    });
    it('FIX-3 Distinct then SORT dedupes first', () => {
        expect(ids(q('TRUEPREDICATE DISTINCT(typeUuid) SORT(level ASC)'))).toEqual(REALM.distinctThenSort);
    });
    it('FIX-3b SORT then Distinct applies descriptors in written order', () => {
        expect(ids(q('TRUEPREDICATE SORT(level ASC) DISTINCT(typeUuid)'))).toEqual(REALM.sortThenDistinct);
    });
    it('FIX-4 accepts long spelling ascending/descending', () => {
        expect(ids(q('TRUEPREDICATE SORT(level ascending)'))).toEqual(REALM.longAscending);
        expect(ids(q('TRUEPREDICATE SORT(level descending)'))).toEqual(REALM.longDescending);
    });
    it('FIX-2 tied sort keys fall back to table order', () => {
        expect(ids(q('TRUEPREDICATE SORT(level ASC)'))).toEqual(REALM.tiedSortKey);
    });
});
