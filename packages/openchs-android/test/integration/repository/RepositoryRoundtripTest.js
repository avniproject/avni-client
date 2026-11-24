/**
 * Pilot integration test for the `integration` jest project.
 *
 * Under that project, `@op-engineering/op-sqlite` is rewritten to
 * test/helpers/nodeSqliteAdapter.js (better-sqlite3 wrapper), so any code
 * path that calls `require("@op-engineering/op-sqlite")` gets a real DB.
 *
 * Run only this project:
 *   npx jest --selectProjects integration
 */

import {open} from '@op-engineering/op-sqlite';
import {EntityMappingConfig} from 'openchs-models';
import {SchemaGenerator} from '../../../src/framework/db/SchemaGenerator';
import SqliteProxy from '../../../src/framework/db/SqliteProxy';
import RepositoryFactory from '../../../src/repository/RepositoryFactory';

describe('integration project: @op-engineering/op-sqlite resolves to real SQLite', () => {
    let db;

    beforeAll(() => {
        db = open({name: `pilot_${Date.now()}.db`});
    });

    afterAll(() => {
        if (db) db.close();
    });

    it('persists and reads back a row through raw SQL', () => {
        db.executeSync('CREATE TABLE pilot (id INTEGER PRIMARY KEY, name TEXT)');
        db.executeSync('INSERT INTO pilot (id, name) VALUES (?, ?)', [1, 'avni']);

        const result = db.executeSync('SELECT name FROM pilot WHERE id = ?', [1]);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].name).toBe('avni');
    });
});

describe('integration project: Repository roundtrip via SqliteProxy', () => {
    let rawDb, proxy, factory;

    beforeAll(() => {
        rawDb = open({name: `repo_roundtrip_${Date.now()}.db`});
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
        factory = new RepositoryFactory(proxy);
    });

    afterAll(() => {
        if (rawDb) rawDb.close();
    });

    it('saves a Gender via repository and reads it back', () => {
        const repo = factory.getRepository('Gender');
        const uuid = 'gender-roundtrip-1';

        proxy.write(() => {
            proxy.create('Gender', {uuid, name: 'Female', voided: false}, true, {skipHydration: true});
        });

        const found = proxy.objects('Gender').filtered(`uuid = "${uuid}"`)[0];
        expect(found).toBeDefined();
        expect(found.uuid).toBe(uuid);
        expect(found.name).toBe('Female');

        // RepositoryFactory.getRepository → SqliteRepository.findAll path
        const all = repo.findAll();
        const match = Array.from(all).find(g => g.uuid === uuid);
        expect(match).toBeDefined();
        expect(match.name).toBe('Female');
    });
});
