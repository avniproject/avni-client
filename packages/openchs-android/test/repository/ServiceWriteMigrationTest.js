import BaseService from '../../src/service/BaseService';
import EncounterServiceUtil from '../../src/service/EncounterServiceUtil';

global.Realm = {UpdateMode: {Modified: 'modified'}};

describe('Phase 1c: Service write migration to repository layer', () => {
    let mockDb;
    let mockRepository;
    let mockTransactionManager;
    let mockRepositoryFactory;

    function createMockRepository() {
        return {
            findAll: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue([])}),
            getAllNonVoided: jest.fn(),
            existsByUuid: jest.fn(),
            filtered: jest.fn(),
            create: jest.fn((entity) => entity),
        };
    }

    beforeEach(() => {
        mockRepository = createMockRepository();

        mockTransactionManager = {
            write: jest.fn((fn) => fn()),
            runInTransaction: jest.fn((fn) => fn()),
            isInTransaction: false,
        };

        const repositories = {};
        mockRepositoryFactory = {
            getRepository: jest.fn((schema) => {
                if (!repositories[schema]) repositories[schema] = createMockRepository();
                return repositories[schema];
            }),
            transactionManager: mockTransactionManager,
        };
        // Default schema returns main mockRepository
        mockRepositoryFactory.getRepository.mockImplementation((schema) => {
            if (!schema || schema === 'TestSchema') return mockRepository;
            if (!repositories[schema]) repositories[schema] = createMockRepository();
            return repositories[schema];
        });

        mockDb = {
            objects: jest.fn(),
            create: jest.fn((schema, entity) => entity),
            delete: jest.fn(),
            write: jest.fn((fn) => fn()),
            isInTransaction: false,
        };
    });

    function createServiceWithSchema(schemaName = 'TestSchema') {
        const mockContext = {
            getRepositoryFactory: () => mockRepositoryFactory,
            getService: jest.fn(),
        };
        const service = new BaseService(mockDb, mockContext);
        service.getSchema = () => schemaName;
        return service;
    }

    describe('BaseService.getCreateEntityFunctions()', () => {
        it('uses repository.create() instead of db.create()', () => {
            const service = createServiceWithSchema();
            const entities = [{uuid: '1'}, {uuid: '2'}];

            const fns = service.getCreateEntityFunctions('TestSchema', entities);
            fns.forEach(fn => fn());

            expect(mockRepository.create).toHaveBeenCalledTimes(2);
            expect(mockRepository.create).toHaveBeenCalledWith({uuid: '1'}, 'modified');
            expect(mockRepository.create).toHaveBeenCalledWith({uuid: '2'}, 'modified');
            expect(mockDb.create).not.toHaveBeenCalled();
        });
    });

    describe('EncounterServiceUtil.isNotFilled()', () => {
        it('accepts repository instead of db', () => {
            const mockFilteredResult = {length: 1, filtered: jest.fn().mockReturnValue({length: 1})};
            const repository = {
                findAll: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue(mockFilteredResult)}),
            };
            const entity = {uuid: 'enc-1'};

            const result = EncounterServiceUtil.isNotFilled(repository, entity);

            expect(repository.findAll).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('returns true when no encounters exist', () => {
            const repository = {
                findAll: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue({length: 0})}),
            };

            expect(EncounterServiceUtil.isNotFilled(repository, {uuid: 'x'})).toBe(true);
        });
    });

    describe('write method patterns', () => {
        it('services use transactionManager.write() instead of db.write()', () => {
            const service = createServiceWithSchema();
            const entity = {uuid: 'abc'};

            service.saveOrUpdate(entity);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockDb.write).not.toHaveBeenCalled();
        });

        it('services use repository.create() instead of db.create() inside transactions', () => {
            const service = createServiceWithSchema();
            const entity = {uuid: 'abc'};

            service.save(entity);

            expect(mockRepository.create).toHaveBeenCalledWith(entity);
            expect(mockDb.create).not.toHaveBeenCalled();
        });

        it('services still use db.delete() for deletes', () => {
            const service = createServiceWithSchema();
            const entity = {uuid: 'abc'};

            service.delete(entity);

            expect(mockDb.delete).toHaveBeenCalledWith(entity);
        });
    });
});
