import RealmRepository from '../../src/repository/RealmRepository';

describe('RealmRepository', () => {
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
        };
        repository = new RealmRepository(mockDb, schemaName);
    });

    describe('findAll', () => {
        it('should call db.objects with schema name', () => {
            const mockResults = {filtered: jest.fn(), length: 0};
            mockDb.objects.mockReturnValue(mockResults);

            const result = repository.findAll();

            expect(mockDb.objects).toHaveBeenCalledWith(schemaName);
            expect(result).toBe(mockResults);
        });
    });

    describe('findByUuid', () => {
        it('should return null for empty uuid', () => {
            expect(repository.findByUuid('')).toBeNull();
            expect(repository.findByUuid(null)).toBeNull();
            expect(repository.findByUuid(undefined)).toBeNull();
        });

        it('should find entity by uuid', () => {
            const entity = {uuid: 'abc-123', name: 'Test'};
            const mockFiltered = [entity];
            mockFiltered.length = 1;
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            const result = repository.findByUuid('abc-123');

            expect(mockResults.filtered).toHaveBeenCalledWith('uuid = $0', 'abc-123');
            expect(result).toBe(entity);
        });

        it('should return null when uuid not found', () => {
            const mockFiltered = [];
            mockFiltered.length = 0;
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            const result = repository.findByUuid('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('findAllByCriteria', () => {
        it('should filter with criteria string', () => {
            const mockFiltered = [{name: 'Test'}];
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            const result = repository.findAllByCriteria('name = "Test"');

            expect(mockResults.filtered).toHaveBeenCalledWith('name = "Test"');
            expect(result).toBe(mockFiltered);
        });
    });

    describe('filtered', () => {
        it('should pass through arguments to filtered', () => {
            const mockFiltered = [];
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            repository.filtered('age > $0', 18);

            expect(mockResults.filtered).toHaveBeenCalledWith('age > $0', 18);
        });
    });

    describe('save', () => {
        it('should create entity without update mode', () => {
            const entity = {uuid: 'abc', name: 'Test'};

            repository.save(entity);

            expect(mockDb.write).toHaveBeenCalled();
            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entity);
        });
    });

    describe('saveOrUpdate', () => {
        it('should create entity with update mode true', () => {
            const entity = {uuid: 'abc', name: 'Test'};

            repository.saveOrUpdate(entity);

            expect(mockDb.write).toHaveBeenCalled();
            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entity, true);
        });
    });

    describe('delete', () => {
        it('should delete object within transaction', () => {
            const entity = {uuid: 'abc'};

            repository.delete(entity);

            expect(mockDb.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(entity);
        });
    });

    describe('objectForPrimaryKey', () => {
        it('should call db.objectForPrimaryKey with schema and key', () => {
            const entity = {uuid: 'abc-123'};
            mockDb.objectForPrimaryKey.mockReturnValue(entity);

            const result = repository.objectForPrimaryKey('abc-123');

            expect(mockDb.objectForPrimaryKey).toHaveBeenCalledWith(schemaName, 'abc-123');
            expect(result).toBe(entity);
        });
    });

    describe('count', () => {
        it('should return number of objects', () => {
            const mockResults = {length: 5, filtered: jest.fn()};
            mockDb.objects.mockReturnValue(mockResults);

            expect(repository.count()).toBe(5);
        });
    });

    describe('getAllNonVoided', () => {
        it('should filter by voided = false', () => {
            const mockFiltered = [{voided: false}];
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            const result = repository.getAllNonVoided();

            expect(mockResults.filtered).toHaveBeenCalledWith('voided = false');
            expect(result).toBe(mockFiltered);
        });
    });

    describe('existsByUuid', () => {
        it('should return false for empty uuid', () => {
            expect(repository.existsByUuid('')).toBe(false);
            expect(repository.existsByUuid(null)).toBe(false);
        });

        it('should return true when entity exists', () => {
            const mockFiltered = {length: 1};
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            expect(repository.existsByUuid('abc-123')).toBe(true);
        });

        it('should return false when entity does not exist', () => {
            const mockFiltered = {length: 0};
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockDb.objects.mockReturnValue(mockResults);

            expect(repository.existsByUuid('nonexistent')).toBe(false);
        });
    });

    describe('updateDatabase', () => {
        it('should update the db reference', () => {
            const newDb = {objects: jest.fn()};
            repository.updateDatabase(newDb);

            const mockResults = {filtered: jest.fn(), length: 0};
            newDb.objects.mockReturnValue(mockResults);

            repository.findAll();
            expect(newDb.objects).toHaveBeenCalledWith(schemaName);
            expect(mockDb.objects).not.toHaveBeenCalled();
        });
    });

    describe('bulkSaveOrUpdate', () => {
        it('should create all entities in a single transaction', () => {
            const entities = [
                {uuid: '1', name: 'A'},
                {uuid: '2', name: 'B'},
            ];

            repository.bulkSaveOrUpdate(entities);

            expect(mockDb.write).toHaveBeenCalledTimes(1);
            expect(mockDb.create).toHaveBeenCalledTimes(2);
            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entities[0], true);
            expect(mockDb.create).toHaveBeenCalledWith(schemaName, entities[1], true);
        });
    });
});
