/**
 * End-to-end integration check for the partial-upsert sync parity behaviour.
 *
 * The unit-level counterparts in test/repository/SqliteRepositoryUnitTest.js
 * verify SQL string generation against mocks. This file verifies the actual
 * persisted state against a real SQLite DB:
 *   1. A full entity is upserted; observations + first_name are stored.
 *   2. A partial upsert (PK + encounters only) must NOT clobber existing
 *      first_name / observations — the sync associateChild flow depends on
 *      this.
 *   3. PK-only upsert of a new uuid creates the row without erroring on the
 *      empty SET clause.
 */

import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../src/framework/db/SqliteProxy';
import {open} from '@op-engineering/op-sqlite';

describe('Sync parity: partial upsert preserves existing data on real SQLite', () => {
    let rawDb, proxy;

    beforeAll(() => {
        rawDb = open({name: `sync_parity_${Date.now()}.db`});
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
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    it('partial upsert (PK + encounters only) leaves existing first_name and observations intact', () => {
        const indUuid = 'ind-partial-upsert-1';

        proxy.write(() => {
            proxy.create('Individual', {
                uuid: indUuid,
                firstName: 'Jane',
                voided: false,
                observations: [{concept: {uuid: 'c-1'}, valueJSON: '{"value":"ans"}'}],
            }, true, {skipHydration: true});
        });

        const beforeRows = rawDb.executeSync(
            'SELECT first_name, observations FROM individual WHERE uuid = ?', [indUuid]
        ).rows;
        expect(beforeRows).toHaveLength(1);
        expect(beforeRows[0].first_name).toBe('Jane');
        const obsBefore = JSON.parse(beforeRows[0].observations);
        expect(obsBefore).toHaveLength(1);
        expect(obsBefore[0].concept.uuid).toBe('c-1');

        proxy.write(() => {
            proxy.create('Individual', {
                uuid: indUuid,
                encounters: [{uuid: 'enc-1'}],
            }, true, {skipHydration: true});
        });

        const afterRows = rawDb.executeSync(
            'SELECT first_name, observations FROM individual WHERE uuid = ?', [indUuid]
        ).rows;
        expect(afterRows).toHaveLength(1);
        expect(afterRows[0].first_name).toBe('Jane');
        const obsAfter = JSON.parse(afterRows[0].observations);
        expect(obsAfter).toHaveLength(1);
        expect(obsAfter[0].concept.uuid).toBe('c-1');
    });

    it('PK-only upsert of a new uuid inserts without erroring on empty SET clause', () => {
        const indUuid = 'ind-pk-only-1';

        expect(() => {
            proxy.write(() => {
                proxy.create('Individual', {uuid: indUuid}, true, {skipHydration: true});
            });
        }).not.toThrow();

        const rows = rawDb.executeSync(
            'SELECT uuid FROM individual WHERE uuid = ?', [indUuid]
        ).rows;
        expect(rows).toHaveLength(1);
        expect(rows[0].uuid).toBe(indUuid);
    });
});
