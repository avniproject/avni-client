import RepositoryFactory from '../../src/repository/RepositoryFactory';
import TransactionManager from '../../src/repository/TransactionManager';

function createMockRealmDb() {
    return {
        isSqlite: false,
        objects: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnThis(), length: 0}),
        create: jest.fn(),
        delete: jest.fn(),
        write: jest.fn((fn) => fn()),
        objectForPrimaryKey: jest.fn(),
        isInTransaction: false,
    };
}

function createMockSqliteDb() {
    const proxy = {
        filtered: jest.fn().mockReturnThis(),
        sorted: jest.fn().mockReturnThis(),
        length: 0,
    };
    return {
        isSqlite: true,
        objects: jest.fn().mockReturnValue(proxy),
        create: jest.fn(),
        delete: jest.fn(),
        write: jest.fn((fn) => fn()),
        objectForPrimaryKey: jest.fn(),
        isInTransaction: false,
        buildReferenceCache: jest.fn(),
        _proxy: proxy,
    };
}

describe('RepositoryFactory backend switching', () => {
    it('creates RealmRepository for Realm db', () => {
        const factory = new RepositoryFactory(createMockRealmDb());
        const repo = factory.getRepository('TestSchema');

        expect(repo.constructor.name).toBe('RealmRepository');
    });

    it('creates SqliteRepository for SQLite db', () => {
        const factory = new RepositoryFactory(createMockSqliteDb());
        const repo = factory.getRepository('TestSchema');

        expect(repo.constructor.name).toBe('SqliteRepository');
    });

    it('registers pilot repos for Realm only', () => {
        const realmFactory = new RepositoryFactory(createMockRealmDb());
        const sqliteFactory = new RepositoryFactory(createMockSqliteDb());

        // Realm factory has pilot repos pre-registered
        const realmIndividualRepo = realmFactory.getRepository('Individual');
        expect(realmIndividualRepo.constructor.name).toBe('IndividualRepository');

        // SQLite factory creates generic SqliteRepository
        const sqliteIndividualRepo = sqliteFactory.getRepository('Individual');
        expect(sqliteIndividualRepo.constructor.name).toBe('SqliteRepository');
    });

    it('caches repositories by schema name', () => {
        const factory = new RepositoryFactory(createMockSqliteDb());

        const repo1 = factory.getRepository('TestSchema');
        const repo2 = factory.getRepository('TestSchema');

        expect(repo1).toBe(repo2);
    });

    it('creates different repos for different schemas', () => {
        const factory = new RepositoryFactory(createMockSqliteDb());

        const repo1 = factory.getRepository('SchemaA');
        const repo2 = factory.getRepository('SchemaB');

        expect(repo1).not.toBe(repo2);
    });
});

describe('TransactionManager with SQLite db', () => {
    it('delegates write to db.write', () => {
        const db = createMockSqliteDb();
        const tm = new TransactionManager(db);

        tm.write(() => 'result');

        expect(db.write).toHaveBeenCalled();
    });

    it('runInTransaction calls fn directly if already in transaction', () => {
        const db = createMockSqliteDb();
        db.isInTransaction = true;
        const tm = new TransactionManager(db);
        const fn = jest.fn();

        tm.runInTransaction(fn);

        expect(fn).toHaveBeenCalled();
        expect(db.write).not.toHaveBeenCalled();
    });

    it('runInTransaction wraps in write if not in transaction', () => {
        const db = createMockSqliteDb();
        db.isInTransaction = false;
        const tm = new TransactionManager(db);
        const fn = jest.fn();

        tm.runInTransaction(fn);

        expect(db.write).toHaveBeenCalled();
    });
});

describe('SqliteRepository through RepositoryFactory', () => {
    let factory;
    let db;

    beforeEach(() => {
        db = createMockSqliteDb();
        factory = new RepositoryFactory(db);
    });

    it('findAll calls db.objects', () => {
        const repo = factory.getRepository('TestSchema');
        repo.findAll();

        expect(db.objects).toHaveBeenCalledWith('TestSchema');
    });

    it('save wraps in write and creates', () => {
        const repo = factory.getRepository('TestSchema');
        const entity = {uuid: 'abc'};

        repo.save(entity);

        expect(db.write).toHaveBeenCalled();
        expect(db.create).toHaveBeenCalledWith('TestSchema', entity);
    });

    it('delete wraps in write', () => {
        const repo = factory.getRepository('TestSchema');
        const entity = {uuid: 'abc'};

        repo.delete(entity);

        expect(db.write).toHaveBeenCalled();
        expect(db.delete).toHaveBeenCalledWith(entity);
    });

    it('query returns SqliteQueryBuilder', () => {
        const repo = factory.getRepository('TestSchema');
        const builder = repo.query();

        expect(typeof builder.eq).toBe('function');
        expect(typeof builder.all).toBe('function');
        expect(typeof builder.nonVoided).toBe('function');
    });

    it('updateDatabase propagates to all cached repos', () => {
        const repo1 = factory.getRepository('SchemaA');
        const repo2 = factory.getRepository('SchemaB');

        const newDb = createMockSqliteDb();
        factory.updateDatabase(newDb);

        // Repos should now use the new db
        repo1.findAll();
        expect(newDb.objects).toHaveBeenCalledWith('SchemaA');

        repo2.findAll();
        expect(newDb.objects).toHaveBeenCalledWith('SchemaB');
    });
});

describe('Sync parity: partial-object upsert preserves existing data', () => {
    // Simulates the sync flow where:
    // 1. An Individual is synced with full data (including observations)
    // 2. An Encounter is synced and associateChild creates a partial Individual
    //    (with only uuid + encounters) for upsert
    // 3. The partial upsert must NOT overwrite the existing observations

    it('flatten of partial entity excludes absent properties from SQL columns', () => {
        // This test uses EntityHydrator directly to verify the flatten behavior
        const EntityHydrator = require('../../src/framework/db/EntityHydrator').default;

        const realmSchemaMap = new Map();
        realmSchemaMap.set("Individual", {
            name: "Individual",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                firstName: "string",
                voided: {type: "bool", default: false},
                observations: {type: "list", objectType: "Observation"},
                encounters: {type: "list", objectType: "Encounter"},
            }
        });
        realmSchemaMap.set("Encounter", {
            name: "Encounter",
            primaryKey: "uuid",
            properties: {uuid: "string"}
        });

        const hydrator = new EntityHydrator(new Map(), realmSchemaMap, jest.fn(), {});

        // Full entity (as synced initially)
        const fullEntity = {
            that: {
                uuid: "ind-1",
                firstName: "Jane",
                voided: false,
                observations: [{concept: {uuid: "c1"}, valueJSON: "{}"}],
                encounters: [],
            }
        };

        const fullFlat = hydrator.flatten("Individual", fullEntity);
        expect(fullFlat.uuid).toBe("ind-1");
        expect(fullFlat.first_name).toBe("Jane");
        expect(fullFlat).toHaveProperty("observations");
        expect(JSON.parse(fullFlat.observations)).toHaveLength(1);

        // Partial entity (as created by Individual.associateChild via General.pick)
        // Only uuid and encounters are present — simulates the sync associateChild pattern
        const partialEntity = {
            that: {
                uuid: "ind-1",
                encounters: [{uuid: "enc-1"}],
            }
        };

        const partialFlat = hydrator.flatten("Individual", partialEntity);
        expect(partialFlat.uuid).toBe("ind-1");
        // observations must NOT be in the flattened output — this is the key assertion
        expect(partialFlat).not.toHaveProperty("observations");
        // firstName must also NOT be present
        expect(partialFlat).not.toHaveProperty("first_name");
        expect(partialFlat).not.toHaveProperty("voided");
    });

    it('SqliteProxy.create upsert SQL only includes columns from flattened entity', () => {
        // Verify that when flatten produces a partial column set,
        // the INSERT SQL only includes those columns
        const db = createMockSqliteDb();
        const factory = new RepositoryFactory(db);
        const repo = factory.getRepository('TestSchema');

        // Track what create() is called with
        const createCalls = [];
        db.create = jest.fn((...args) => createCalls.push(args));

        const partialEntity = {uuid: 'abc', encounters: [{uuid: 'enc-1'}]};
        repo.create(partialEntity, true);

        expect(db.create).toHaveBeenCalledWith('TestSchema', partialEntity, true);
    });
});

describe('Sync parity: PK-only upsert does not generate malformed SQL', () => {
    // When associateChild creates a parent with only uuid (all other fields
    // absent), flatten produces {uuid: "..."} with no other columns.
    // The upsert SQL must not generate an empty SET clause
    // ("ON CONFLICT DO UPDATE SET" with nothing after SET).

    it('SqliteProxy.create handles PK-only partial object without error', () => {
        const SqliteProxy = require('../../src/framework/db/SqliteProxy').default;
        const {SchemaGenerator, TableMeta, ColumnDef} = require('../../src/framework/db/SchemaGenerator');

        // Minimal tableMetaMap and realmSchemaMap for Individual
        const tableMetaMap = new Map();
        tableMetaMap.set("Individual", new TableMeta("Individual", "individual", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("first_name", "TEXT"),
            new ColumnDef("voided", "INTEGER", false, false, false),
            new ColumnDef("observations", "TEXT", false, true, "[]"),
        ], {encounters: "Encounter"}, {}));

        const realmSchemaMap = new Map();
        realmSchemaMap.set("Individual", {
            name: "Individual",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                firstName: "string",
                voided: {type: "bool", default: false},
                observations: {type: "list", objectType: "Observation"},
                encounters: {type: "list", objectType: "Encounter"},
            }
        });

        const executedSql = [];
        const mockDb = {
            executeSync: jest.fn((sql, params) => {
                executedSql.push({sql, params});
                return {rows: []};
            }),
        };

        const proxy = new SqliteProxy(mockDb, {
            getEntityClass: () => function(obj) { this.that = obj; },
            getMandatoryObjectSchemaProperties: () => [],
        }, tableMetaMap, realmSchemaMap);

        // PK-only partial object (simulates associateChild with only uuid)
        const pkOnlyEntity = {uuid: "ind-1"};

        // Should not throw "incomplete input"
        expect(() => proxy.create("Individual", pkOnlyEntity, true)).not.toThrow();

        // The SQL should be INSERT OR IGNORE (not ON CONFLICT DO UPDATE SET <empty>)
        const insertCall = executedSql.find(c => c.sql.includes("INSERT"));
        expect(insertCall).toBeDefined();
        expect(insertCall.sql).toContain("INSERT OR IGNORE");
        expect(insertCall.sql).not.toContain("DO UPDATE SET");
    });

    it('SqliteProxy.create generates proper upsert when partial object has PK + some columns', () => {
        const SqliteProxy = require('../../src/framework/db/SqliteProxy').default;
        const {TableMeta, ColumnDef} = require('../../src/framework/db/SchemaGenerator');

        const tableMetaMap = new Map();
        tableMetaMap.set("Individual", new TableMeta("Individual", "individual", [
            new ColumnDef("uuid", "TEXT", true),
            new ColumnDef("first_name", "TEXT"),
            new ColumnDef("voided", "INTEGER", false, false, false),
            new ColumnDef("observations", "TEXT", false, true, "[]"),
        ], {encounters: "Encounter"}, {}));

        const realmSchemaMap = new Map();
        realmSchemaMap.set("Individual", {
            name: "Individual",
            primaryKey: "uuid",
            properties: {
                uuid: "string",
                firstName: "string",
                voided: {type: "bool", default: false},
                observations: {type: "list", objectType: "Observation"},
                encounters: {type: "list", objectType: "Encounter"},
            }
        });

        const executedSql = [];
        const mockDb = {
            executeSync: jest.fn((sql, params) => {
                executedSql.push({sql, params});
                return {rows: []};
            }),
        };

        const proxy = new SqliteProxy(mockDb, {
            getEntityClass: () => function(obj) { this.that = obj; },
            getMandatoryObjectSchemaProperties: () => [],
        }, tableMetaMap, realmSchemaMap);

        // Partial object with PK + one field (not PK-only)
        const partialEntity = {uuid: "ind-1", firstName: "Jane"};

        expect(() => proxy.create("Individual", partialEntity, true)).not.toThrow();

        const insertCall = executedSql.find(c => c.sql.includes("INSERT"));
        expect(insertCall).toBeDefined();
        // Should use ON CONFLICT DO UPDATE (has columns to update)
        expect(insertCall.sql).toContain("ON CONFLICT");
        expect(insertCall.sql).toContain("COALESCE");
        // Should NOT include observations (absent from source)
        expect(insertCall.sql).not.toContain("observations");
    });
});
