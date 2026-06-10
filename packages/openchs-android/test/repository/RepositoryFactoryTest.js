import RepositoryFactory from '../../src/repository/RepositoryFactory';
import RealmRepository from '../../src/repository/RealmRepository';

// Mock openchs-models to avoid import issues in test environment
jest.mock('openchs-models', () => ({
    Individual: {schema: {name: 'Individual'}},
    Concept: {schema: {name: 'Concept'}},
    Gender: {schema: {name: 'Gender'}},
    AddressLevel: {schema: {name: 'AddressLevel'}},
    FormElement: {schema: {name: 'FormElement'}},
}));

describe('RepositoryFactory', () => {
    let mockDb;
    let factory;

    beforeEach(() => {
        mockDb = {
            objects: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            write: jest.fn((fn) => fn()),
            objectForPrimaryKey: jest.fn(),
            isInTransaction: false,
        };
        factory = new RepositoryFactory(mockDb);
    });

    describe('getRepository', () => {
        it('should return a repository for schema name', () => {
            const repo = factory.getRepository('SomeSchema');
            expect(repo).toBeDefined();
            expect(repo).toBeInstanceOf(RealmRepository);
        });

        it('should cache repositories', () => {
            const repo1 = factory.getRepository('SomeSchema');
            const repo2 = factory.getRepository('SomeSchema');
            expect(repo1).toBe(repo2);
        });

        it('should return different repositories for different schemas', () => {
            const repo1 = factory.getRepository('SchemaA');
            const repo2 = factory.getRepository('SchemaB');
            expect(repo1).not.toBe(repo2);
        });
    });

    describe('pilot repositories', () => {
        it('should pre-register IndividualRepository', () => {
            const repo = factory.getRepository('Individual');
            expect(repo).toBeDefined();
            expect(repo.schemaName).toBe('Individual');
        });

        it('should pre-register ConceptRepository', () => {
            const repo = factory.getRepository('Concept');
            expect(repo).toBeDefined();
            expect(repo.schemaName).toBe('Concept');
        });

        it('should pre-register GenderRepository', () => {
            const repo = factory.getRepository('Gender');
            expect(repo).toBeDefined();
        });

        it('should pre-register AddressLevelRepository', () => {
            const repo = factory.getRepository('AddressLevel');
            expect(repo).toBeDefined();
        });

        it('should pre-register FormElementRepository', () => {
            const repo = factory.getRepository('FormElement');
            expect(repo).toBeDefined();
        });
    });

    describe('registerRepository', () => {
        it('should allow custom repository registration', () => {
            const customRepo = new RealmRepository(mockDb, 'Custom');
            factory.registerRepository('Custom', customRepo);
            expect(factory.getRepository('Custom')).toBe(customRepo);
        });

        it('should override existing repository', () => {
            const repo1 = factory.getRepository('SomeSchema');
            const customRepo = new RealmRepository(mockDb, 'SomeSchema');
            factory.registerRepository('SomeSchema', customRepo);
            expect(factory.getRepository('SomeSchema')).toBe(customRepo);
            expect(factory.getRepository('SomeSchema')).not.toBe(repo1);
        });
    });

    describe('transactionManager', () => {
        it('should return a transaction manager', () => {
            const tm = factory.transactionManager;
            expect(tm).toBeDefined();
            expect(tm.runInTransaction).toBeDefined();
            expect(tm.write).toBeDefined();
        });
    });

    describe('updateDatabase', () => {
        it('should propagate new db to all cached repositories', () => {
            const repo = factory.getRepository('TestSchema');
            const newDb = {
                objects: jest.fn().mockReturnValue({filtered: jest.fn(), length: 0}),
                create: jest.fn(),
                delete: jest.fn(),
                write: jest.fn((fn) => fn()),
                objectForPrimaryKey: jest.fn(),
                isInTransaction: false,
            };

            factory.updateDatabase(newDb);

            repo.findAll();
            expect(newDb.objects).toHaveBeenCalledWith('TestSchema');
        });

        it('should update transaction manager db', () => {
            const newDb = {
                objects: jest.fn(),
                create: jest.fn(),
                delete: jest.fn(),
                write: jest.fn((fn) => fn()),
                objectForPrimaryKey: jest.fn(),
                isInTransaction: false,
            };

            factory.updateDatabase(newDb);
            factory.transactionManager.write(() => {});
            expect(newDb.write).toHaveBeenCalled();
        });
    });
});
