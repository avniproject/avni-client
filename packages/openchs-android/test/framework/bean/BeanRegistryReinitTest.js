/**
 * Verifies that RepositoryFactory correctly updates _isSqlite and clears
 * the repository cache when the backend type changes during switchBackend.
 *
 * Run: npx jest test/framework/bean/BeanRegistryReinitTest.js --verbose
 */

const fs = require('fs');
const path = require('path');

describe('RepositoryFactory.updateDatabase handles backend switch', () => {
    it('updates _isSqlite and clears cache when backend type changes', () => {
        const RepositoryFactory = require('../../../src/repository/RepositoryFactory').default;

        const realmDb = {isSqlite: false, write: jest.fn(fn => fn()), objects: jest.fn()};
        const sqliteDb = {isSqlite: true, write: jest.fn(fn => fn()), objects: jest.fn()};

        const factory = new RepositoryFactory(realmDb);
        expect(factory._isSqlite).toBe(false);

        // Request a repository — it should be RealmRepository
        const realmRepo = factory.getRepository('TestSchema');
        expect(realmRepo.constructor.name).toBe('RealmRepository');

        // Switch to SQLite
        factory.updateDatabase(sqliteDb);
        expect(factory._isSqlite).toBe(true);
        expect(factory.db).toBe(sqliteDb);

        // Cache should have been cleared — new repo should be SqliteRepository
        const sqliteRepo = factory.getRepository('TestSchema');
        expect(sqliteRepo.constructor.name).toBe('SqliteRepository');
        expect(sqliteRepo.db).toBe(sqliteDb);
    });

    it('does not clear cache when backend type stays the same', () => {
        const RepositoryFactory = require('../../../src/repository/RepositoryFactory').default;

        const db1 = {isSqlite: true, write: jest.fn(fn => fn()), objects: jest.fn()};
        const db2 = {isSqlite: true, write: jest.fn(fn => fn()), objects: jest.fn()};

        const factory = new RepositoryFactory(db1);
        const repo1 = factory.getRepository('TestSchema');
        expect(repo1.db).toBe(db1);

        // Update to a different SQLite db instance (same type)
        factory.updateDatabase(db2);

        // Same repo instance, just updated db reference
        const repo2 = factory.getRepository('TestSchema');
        expect(repo2).toBe(repo1); // same instance (from cache)
        expect(repo2.db).toBe(db2); // but with updated db
    });
});

describe('EntityHydrator._batchPreloadFkReferences does not overwrite deep cache', () => {
    it('source code has guard to prevent overwriting existing session cache entries', () => {
        const filePath = path.resolve(__dirname, '../../../src/framework/db/EntityHydrator.js');
        const source = fs.readFileSync(filePath, 'utf-8');

        // Find the _batchPreloadFkReferences method's cache set line
        const methodMatch = source.match(
            /_batchPreloadFkReferences[\s\S]*?for \(const row of rows\)[\s\S]*?if \(row\.uuid\)([\s\S]*?)profileEntries/
        );
        expect(methodMatch).not.toBeNull();
        const cacheSetBlock = methodMatch[1];

        // Must have the guard: if (!this._hydrationCache.has(cacheKey))
        expect(cacheSetBlock).toContain('_hydrationCache.has(cacheKey)');
    });
});
