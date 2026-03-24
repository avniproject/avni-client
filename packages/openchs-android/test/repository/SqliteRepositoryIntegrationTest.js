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
