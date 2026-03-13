import BaseService from '../../src/service/BaseService';

describe('BaseService repository delegation', () => {
    let service;
    let mockDb;
    let mockRepository;
    let mockTransactionManager;
    let mockRepositoryFactory;
    const schemaName = 'TestSchema';

    beforeEach(() => {
        mockRepository = {
            findAll: jest.fn(),
            getAllNonVoided: jest.fn(),
            existsByUuid: jest.fn(),
            filtered: jest.fn(),
            create: jest.fn(),
        };

        mockTransactionManager = {
            write: jest.fn((fn) => fn()),
            runInTransaction: jest.fn((fn) => fn()),
            isInTransaction: false,
        };

        mockRepositoryFactory = {
            getRepository: jest.fn().mockReturnValue(mockRepository),
            transactionManager: mockTransactionManager,
        };

        mockDb = {
            objects: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            write: jest.fn((fn) => fn()),
            isInTransaction: false,
        };

        const mockContext = {
            getRepositoryFactory: () => mockRepositoryFactory,
        };

        service = new BaseService(mockDb, mockContext);
        service.getSchema = () => schemaName;
    });

    describe('read methods', () => {
        it('findAll() delegates to repository.findAll()', () => {
            const mockResults = {filtered: jest.fn(), length: 2};
            mockRepository.findAll.mockReturnValue(mockResults);

            const result = service.findAll();

            expect(mockRepositoryFactory.getRepository).toHaveBeenCalledWith(schemaName);
            expect(mockRepository.findAll).toHaveBeenCalled();
            expect(result).toBe(mockResults);
            expect(mockDb.objects).not.toHaveBeenCalled();
        });

        it('findAll(otherSchema) delegates to getRepository(otherSchema).findAll()', () => {
            const mockResults = {filtered: jest.fn(), length: 1};
            mockRepository.findAll.mockReturnValue(mockResults);

            service.findAll('OtherSchema');

            expect(mockRepositoryFactory.getRepository).toHaveBeenCalledWith('OtherSchema');
        });

        it('getAll() delegates to repository.findAll()', () => {
            const mockResults = {length: 3, map: jest.fn()};
            mockRepository.findAll.mockReturnValue(mockResults);

            const result = service.getAll();

            expect(mockRepository.findAll).toHaveBeenCalled();
            expect(result).toBe(mockResults);
        });

        it('getAllNonVoided() delegates to repository.getAllNonVoided()', () => {
            const mockResults = [{voided: false}];
            mockRepository.getAllNonVoided.mockReturnValue(mockResults);

            const result = service.getAllNonVoided();

            expect(mockRepository.getAllNonVoided).toHaveBeenCalled();
            expect(result).toBe(mockResults);
        });

        it('existsByUuid() delegates to repository.existsByUuid()', () => {
            mockRepository.existsByUuid.mockReturnValue(true);

            const result = service.existsByUuid('abc-123');

            expect(mockRepository.existsByUuid).toHaveBeenCalledWith('abc-123');
            expect(result).toBe(true);
        });

        it('filtered() delegates to repository.filtered()', () => {
            const mockResults = [];
            mockRepository.filtered.mockReturnValue(mockResults);

            service.filtered('age > $0', 18);

            expect(mockRepository.filtered).toHaveBeenCalledWith('age > $0', 18);
        });

        it('findAllByCriteria() chains findAll().filtered()', () => {
            const mockFiltered = [{name: 'Test'}];
            const mockResults = {filtered: jest.fn().mockReturnValue(mockFiltered)};
            mockRepository.findAll.mockReturnValue(mockResults);

            const result = service.findAllByCriteria('name = "Test"');

            expect(mockResults.filtered).toHaveBeenCalledWith('name = "Test"');
            expect(result).toBe(mockFiltered);
        });
    });

    describe('write methods', () => {
        it('saveOrUpdate() uses transactionManager and repository.create()', () => {
            const entity = {uuid: 'abc', name: 'Test'};

            service.saveOrUpdate(entity);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockRepository.create).toHaveBeenCalledWith(entity, true);
        });

        it('save() uses transactionManager and repository.create()', () => {
            const entity = {uuid: 'abc', name: 'Test'};

            service.save(entity);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockRepository.create).toHaveBeenCalledWith(entity);
        });

        it('delete() uses transactionManager and db.delete()', () => {
            const entity = {uuid: 'abc'};

            service.delete(entity);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(entity);
        });

        it('deleteAll() uses transactionManager', () => {
            const mockResults = [{uuid: '1'}, {uuid: '2'}];
            mockRepository.findAll.mockReturnValue(mockResults);

            service.deleteAll();

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(mockResults);
        });

        it('bulkSaveOrUpdate() uses transactionManager', () => {
            const fn1 = jest.fn();
            const fn2 = jest.fn();

            service.bulkSaveOrUpdate([fn1, fn2]);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(fn1).toHaveBeenCalled();
            expect(fn2).toHaveBeenCalled();
        });

        it('runInTransaction() delegates to transactionManager.runInTransaction()', () => {
            const fn = jest.fn().mockReturnValue('result');

            const result = service.runInTransaction(fn);

            expect(mockTransactionManager.runInTransaction).toHaveBeenCalledWith(fn);
            expect(result).toBe('result');
        });

        it('clearDataIn() uses transactionManager per entity type', () => {
            const mockResults = [{uuid: '1'}];
            mockRepository.findAll.mockReturnValue(mockResults);

            const entityTypes = [
                {schema: {name: 'TypeA'}},
                {schema: {name: 'TypeB'}},
            ];

            service.clearDataIn(entityTypes);

            expect(mockTransactionManager.write).toHaveBeenCalledTimes(2);
            expect(mockRepositoryFactory.getRepository).toHaveBeenCalledWith('TypeA');
            expect(mockRepositoryFactory.getRepository).toHaveBeenCalledWith('TypeB');
            expect(mockDb.delete).toHaveBeenCalledTimes(2);
        });
    });
});
