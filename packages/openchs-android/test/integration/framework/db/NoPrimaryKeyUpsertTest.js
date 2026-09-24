/**
 * avniproject/avni-client#2138 — saving a program enrolment that carries a user-based
 * identifier crashed on SQLite with "ON CONFLICT clause does not match any PRIMARY KEY
 * or UNIQUE constraint". IdentifierAssignmentService is the one EntityQueue caller that
 * asks for an upsert, and entity_queue has no primary key, so the template named a
 * conflict target the table does not have.
 *
 * Real SQLite, not a mock: the defect was the database rejecting the statement, so only
 * a database can prove it is gone.
 *
 * The rejection is worded differently here than on the device. Both builds refuse the same
 * statement — `... ON CONFLICT("uuid") DO UPDATE SET ...` against entity_queue — but
 * better-sqlite3 resolves the column name first and reports `no such column: "uuid"`, while
 * op-sqlite on Android reports the constraint check. So these tests assert that the write
 * succeeds and the row lands, rather than matching an error string that varies by build.
 */

import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../../src/framework/db/SqliteProxy';
import {open} from '@op-engineering/op-sqlite';

describe('upsert against a table with no primary key', () => {
    let rawDb, proxy;

    beforeAll(() => {
        rawDb = open({name: `nopk_upsert_${Date.now()}.db`});
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

    const queueRow = (entityUUID) => ({
        entityUUID,
        entity: 'IdentifierAssignment',
        savedAt: new Date('2026-09-21T08:50:59Z'),
    });

    const rowsFor = (entityUUID) => rawDb.executeSync(
        'SELECT entity_uuid, entity FROM entity_queue WHERE entity_uuid = ?', [entityUUID]
    ).rows;

    it('accepts the upsert IdentifierAssignmentService asks for, instead of rejecting it', () => {
        expect(() => {
            proxy.write(() => {
                proxy.create('EntityQueue', queueRow('ia-2138-a'), true, {skipHydration: true});
            });
        }).not.toThrow();

        expect(rowsFor('ia-2138-a')).toHaveLength(1);
    });

    it('keeps one row per entityUUID across repeated upserts, as Realm did', () => {
        proxy.write(() => {
            proxy.create('EntityQueue', queueRow('ia-2138-b'), true, {skipHydration: true});
            proxy.create('EntityQueue', queueRow('ia-2138-b'), true, {skipHydration: true});
            proxy.create('EntityQueue', queueRow('ia-2138-b'), true, {skipHydration: true});
        });

        expect(rowsFor('ia-2138-b')).toHaveLength(1);
    });

    it('still keeps separate rows for different entityUUIDs', () => {
        proxy.write(() => {
            proxy.create('EntityQueue', queueRow('ia-2138-c'), true, {skipHydration: true});
            proxy.create('EntityQueue', queueRow('ia-2138-d'), true, {skipHydration: true});
        });

        expect(rowsFor('ia-2138-c')).toHaveLength(1);
        expect(rowsFor('ia-2138-d')).toHaveLength(1);
    });

    it('a one-argument create still works on the same table', () => {
        proxy.write(() => {
            proxy.create('EntityQueue', queueRow('ia-2138-e'), false, {skipHydration: true});
        });

        expect(rowsFor('ia-2138-e')).toHaveLength(1);
    });
});
