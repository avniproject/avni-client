import SqliteRepository from '../../src/repository/SqliteRepository';

describe('SqliteRepository', () => {
    let mockDb;
    let repository;
    const schemaName = 'TestSchema';

    beforeEach(() => {
        mockDb = {
            objects: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            write: jest.fn((fn) => fn()),
            objectForPrimaryKey: jest.fn(),
            isInTransaction: false,
            isSqlite: true,
        };
        repository = new SqliteRepository(mockDb, schemaName);
    });

    describe('findAll', () => {
        it('calls db.objects with schema name', () => {
            const mockResults = {filtered: jest.fn(), length: 0};
            mockDb.objects.mockReturnValue(mockResults);

            const result = repository.findAll();

            expect(mockDb.objects).toHaveBeenCalledWith(schemaName);
            expect(result).toBe(mockResults);
        });
    });

    describe('findByUuid', () => {
        it('returns entity when found', () => {
            const entity = {uuid: 'abc'};
            const mockFiltered = {length: 1, 0: entity};
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            expect(repository.findByUuid('abc')).toBe(entity);
            expect(mockResults.filtered).toHaveBeenCalledWith('uuid = $0', 'abc');
        });

        it('returns null when not found', () => {
            const mockFiltered = {length: 0};
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            expect(repository.findByUuid('nonexistent')).toBeNull();
        });

        it('returns null for empty uuid', () => {
            expect(repository.findByUuid('')).toBeNull();
            expect(repository.findByUuid(null)).toBeNull();
            expect(repository.findByUuid(undefined)).toBeNull();
        });
    });

    describe('save', () => {
        it('wraps in write and calls create without update mode', () => {
            const entity = {uuid: 'abc', name: 'test'};

            repository.save(entity);

            expect(mockDb.write).toHaveBeenCalled();
            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entity);
        });
    });

    describe('saveOrUpdate', () => {
        it('wraps in write and calls create with update mode true', () => {
            const entity = {uuid: 'abc', name: 'test'};

            repository.saveOrUpdate(entity);

            expect(mockDb.write).toHaveBeenCalled();
            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entity, true);
        });
    });

    describe('bulkSaveOrUpdate', () => {
        it('wraps all creates in single write', () => {
            const entities = [{uuid: '1'}, {uuid: '2'}, {uuid: '3'}];

            repository.bulkSaveOrUpdate(entities);

            expect(mockDb.write).toHaveBeenCalledTimes(1);
            expect(mockDb.create).toHaveBeenCalledTimes(3);
        });
    });

    describe('create', () => {
        it('calls db.create directly without write wrapper', () => {
            const entity = {uuid: 'abc'};

            repository.create(entity, true);

            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entity, true);
            expect(mockDb.write).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('wraps in write and calls db.delete', () => {
            const entity = {uuid: 'abc'};

            repository.delete(entity);

            expect(mockDb.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(entity);
        });
    });

    describe('deleteInTransaction', () => {
        it('calls db.delete without write wrapper', () => {
            const entity = {uuid: 'abc'};

            repository.deleteInTransaction(entity);

            expect(mockDb.delete).toHaveBeenCalledWith(entity);
            expect(mockDb.write).not.toHaveBeenCalled();
        });
    });

    describe('objectForPrimaryKey', () => {
        it('calls db.objectForPrimaryKey with schema and key', () => {
            const entity = {uuid: 'abc'};
            mockDb.objectForPrimaryKey.mockReturnValue(entity);

            const result = repository.objectForPrimaryKey('abc');

            expect(mockDb.objectForPrimaryKey).toHaveBeenCalledWith(schemaName, 'abc');
            expect(result).toBe(entity);
        });
    });

    describe('count', () => {
        it('returns length of findAll results', () => {
            mockDb.objects.mockReturnValue({length: 42, filtered: jest.fn()});

            expect(repository.count()).toBe(42);
        });
    });

    describe('getAllNonVoided', () => {
        it('filters by voided = false', () => {
            const mockFiltered = [{uuid: '1'}];
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            repository.getAllNonVoided();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
        });
    });

    describe('existsByUuid', () => {
        it('returns true when entity exists', () => {
            const mockFiltered = {length: 1};
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            expect(repository.existsByUuid('abc')).toBe(true);
        });

        it('returns false for empty uuid', () => {
            expect(repository.existsByUuid('')).toBe(false);
        });
    });

    describe('updateDatabase', () => {
        it('updates the db reference', () => {
            const newDb = {objects: jest.fn(), isSqlite: true};
            repository.updateDatabase(newDb);

            mockDb.objects.mockReturnValue({filtered: jest.fn(), length: 0});
            newDb.objects.mockReturnValue({filtered: jest.fn(), length: 5});

            expect(repository.findAll().length).toBe(5);
        });
    });

    describe('query', () => {
        it('returns a SqliteQueryBuilder', () => {
            mockDb.objects.mockReturnValue({filtered: jest.fn().mockReturnThis(), sorted: jest.fn().mockReturnThis(), length: 0});

            const builder = repository.query();

            expect(builder).toBeDefined();
            expect(typeof builder.eq).toBe('function');
            expect(typeof builder.all).toBe('function');
        });
    });
});
