/**
 * Dual-backend test harness for running the same tests against both Realm and SQLite.
 *
 * Usage:
 *   import {BACKENDS, createDualBackendHarness} from '../helpers/dualBackendTestHarness';
 *
 *   describe.each(BACKENDS)('My tests [%s]', (backend) => {
 *       let harness;
 *       beforeEach(() => { harness = createDualBackendHarness(backend); });
 *       ...
 *   });
 */

import RepositoryFactory from '../../src/repository/RepositoryFactory';

export const BACKENDS = [['realm'], ['sqlite']];

export function createMockRealmDb() {
    const resultProxy = {
        filtered: jest.fn().mockReturnThis(),
        sorted: jest.fn().mockReturnThis(),
        length: 0,
        map: jest.fn().mockReturnValue([]),
        slice: jest.fn().mockReturnValue([]),
    };
    return {
        isSqlite: false,
        objects: jest.fn().mockReturnValue(resultProxy),
        create: jest.fn((schema, entity) => entity),
        delete: jest.fn(),
        write: jest.fn((fn) => fn()),
        objectForPrimaryKey: jest.fn(),
        isInTransaction: false,
        schemaVersion: 1,
        _resultProxy: resultProxy,
    };
}

export function createMockSqliteDb() {
    const resultProxy = {
        filtered: jest.fn().mockReturnThis(),
        sorted: jest.fn().mockReturnThis(),
        length: 0,
        map: jest.fn().mockReturnValue([]),
        slice: jest.fn().mockReturnValue([]),
    };
    return {
        isSqlite: true,
        objects: jest.fn().mockReturnValue(resultProxy),
        create: jest.fn((schema, entity) => entity),
        delete: jest.fn(),
        write: jest.fn((fn) => fn()),
        objectForPrimaryKey: jest.fn(),
        isInTransaction: false,
        schemaVersion: 1,
        buildReferenceCache: jest.fn(),
        _resultProxy: resultProxy,
    };
}

/**
 * Creates a test harness wired through the real RepositoryFactory.
 *
 * @param {'realm'|'sqlite'} backendType
 * @returns {{ mockDb, repositoryFactory, transactionManager, mockContext, services, getRepository }}
 */
export function createDualBackendHarness(backendType) {
    const mockDb = backendType === 'sqlite' ? createMockSqliteDb() : createMockRealmDb();
    const repositoryFactory = new RepositoryFactory(mockDb);
    const services = {};

    const mockContext = {
        getRepositoryFactory: () => repositoryFactory,
        getService: jest.fn((name) => services[name]),
    };

    return {
        mockDb,
        repositoryFactory,
        transactionManager: repositoryFactory.transactionManager,
        mockContext,
        services,
        getRepository: (schema) => repositoryFactory.getRepository(schema),
    };
}
