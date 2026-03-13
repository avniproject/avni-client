/**
 * Repository Integration Tests (Task 1.6)
 *
 * Verifies that key multi-service write workflows correctly use the repository layer
 * (transactionManager.write + repository.create) instead of direct Realm access
 * (db.write + db.create). Tests service methods end-to-end with mocked dependencies.
 */

global.Realm = {UpdateMode: {Modified: 'modified'}};

// Use function declaration + var so they are hoisted above jest.mock() calls
function mockModelsFactory() { return {
    Encounter: {schema: {name: 'Encounter'}, createScheduled: jest.fn()},
    EncounterType: {schema: {name: 'EncounterType'}},
    EntityQueue: {schema: {name: 'EntityQueue'}, create: jest.fn((entity, schema) => ({entityUUID: entity.uuid, entity: schema}))},
    FormMapping: {schema: {name: 'FormMapping'}},
    Individual: {schema: {name: 'Individual'}},
    ObservationsHolder: {convertObsForSave: jest.fn()},
    ProgramEncounter: {schema: {name: 'ProgramEncounter'}},
    ProgramEnrolment: {schema: {name: 'ProgramEnrolment'}},
    EntityApprovalStatus: {schema: {name: 'EntityApprovalStatus'}, getSchemaEntityTypeList: jest.fn().mockReturnValue([])},
    ApprovalStatus: {schema: {name: 'ApprovalStatus'}, statuses: {Pending: 'Pending'}},
    BaseEntity: {collectionHasEntity: jest.fn().mockReturnValue(false)},
    Family: {schema: {name: 'Family'}},
    GroupSubject: {schema: {name: 'GroupSubject'}, create: jest.fn(x => x)},
    GroupRole: {schema: {name: 'GroupRole'}},
    Concept: {dataType: {Id: 'Id'}},
    IndividualRelationship: {schema: {name: 'IndividualRelationship'}, create: jest.fn((rel, type) => ({...rel, relationship: type, uuid: 'ir-1'}))},
    IndividualRelative: {},
    Comment: {schema: {name: 'Comment'}},
    CommentThread: {schema: {name: 'CommentThread'}, threadStatus: {Open: 'Open'}},
    Task: {schema: {name: 'Task'}},
    TaskUnAssignment: {schema: {name: 'TaskUnAssignment'}},
    SubjectProgramEligibility: {schema: {name: 'SubjectProgramEligibility'}},
    ChecklistItem: {schema: {name: 'ChecklistItem'}},
    Checklist: {schema: {name: 'Checklist'}},
    ChecklistDetail: {schema: {name: 'ChecklistDetail'}},
    ChecklistItemDetail: {schema: {name: 'ChecklistItemDetail'}},
    MediaQueue: {schema: {name: 'MediaQueue'}},
    DashboardCache: {schema: {name: 'DashboardCache'}, createEmptyInstance: jest.fn(() => ({uuid: 'dc-1'}))},
    DraftSubject: {schema: {name: 'DraftSubject'}},
    DraftEncounter: {schema: {name: 'DraftEncounter'}, create: jest.fn(e => ({...e, uuid: 'draft-1'}))},
    DraftEnrolment: {schema: {name: 'DraftEnrolment'}, create: jest.fn(e => ({...e, uuid: 'draft-enrol-1'}))},
    DraftProgramEncounter: {schema: {name: 'DraftProgramEncounter'}, create: jest.fn(e => ({...e, uuid: 'draft-pe-1'}))},
    Privilege: {privilegeName: {enrolSubject: 'EnrolSubject', performVisit: 'PerformVisit'}, privilegeEntityType: {enrolment: 'Enrolment', encounter: 'Encounter'}},
    CustomFilter: {type: {}},
    Duration: function() {},
    KeyValue: {PrimaryContactKey: 'primaryContact', ContactNumberKey: 'contactNumber'},
    getUnderlyingRealmCollection: jest.fn(x => x),
    Form: {formTypes: {}},
    IdentifierAssignment: {schema: {name: 'IdentifierAssignment'}},
    Settings: {schema: {name: 'Settings'}, UUID: 'settings-uuid'},
    LocaleMapping: {schema: {name: 'LocaleMapping'}},
    ModelGeneral: {setCurrentLogLevel: jest.fn()},
    OrganisationConfig: {schema: {name: 'OrganisationConfig'}},
    AddressLevel: {schema: {name: 'AddressLevel'}},
}; }

// Both avni-models and openchs-models must return the same singleton
var mockModelsInstance;
jest.mock('avni-models', () => {
    if (!mockModelsInstance) mockModelsInstance = mockModelsFactory();
    return mockModelsInstance;
});
jest.mock('openchs-models', () => {
    if (!mockModelsInstance) mockModelsInstance = mockModelsFactory();
    return mockModelsInstance;
});

jest.mock('../../src/framework/bean/Service', () => {
    return function() { return function(target) { return target; }; };
});
jest.mock('../../src/utility/General', () => ({
    logDebug: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn(),
    LogLevel: {Debug: 0},
    canLog: jest.fn().mockReturnValue(false),
    setCurrentLogLevel: jest.fn(),
    formatDate: jest.fn(d => String(d)),
}));

function createMockRepository() {
    return {
        findAll: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue([]), length: 0, map: jest.fn().mockReturnValue([])}),
        getAllNonVoided: jest.fn().mockReturnValue({filtered: jest.fn().mockReturnValue([])}),
        existsByUuid: jest.fn().mockReturnValue(false),
        filtered: jest.fn().mockReturnValue([]),
        create: jest.fn((entity) => entity),
    };
}

function createTestHarness() {
    const repositories = {};
    const mockDb = {
        objects: jest.fn(),
        create: jest.fn((schema, entity) => entity),
        delete: jest.fn(),
        write: jest.fn((fn) => fn()),
        isInTransaction: false,
        schemaVersion: 1,
    };

    const mockTransactionManager = {
        write: jest.fn((fn) => fn()),
        runInTransaction: jest.fn((fn) => fn()),
        isInTransaction: false,
    };

    const mockRepositoryFactory = {
        getRepository: jest.fn((schema) => {
            if (!repositories[schema]) repositories[schema] = createMockRepository();
            return repositories[schema];
        }),
        transactionManager: mockTransactionManager,
    };

    const services = {};
    const mockContext = {
        getRepositoryFactory: () => mockRepositoryFactory,
        getService: jest.fn((name) => services[name]),
    };

    return {mockDb, mockTransactionManager, mockRepositoryFactory, mockContext, repositories, services};
}

import EntityService from '../../src/service/EntityService';
import FamilyService from '../../src/service/FamilyService';
import CommentThreadService from '../../src/service/comment/CommentThreadService';
import CommentService from '../../src/service/comment/CommentService';
import DashboardCacheService from '../../src/service/DashboardCacheService';
import TaskService from '../../src/service/task/TaskService';
import TaskUnAssignmentService from '../../src/service/task/TaskUnAssignmentService';

describe('Repository Integration Tests', () => {
    describe('EntityService', () => {
        it('saveAndPushToEntityQueue uses transactionManager and repository.create', () => {
            const {mockDb, mockTransactionManager, mockContext, mockRepositoryFactory} = createTestHarness();
            const service = new EntityService(mockDb, mockContext);

            const entity = {uuid: 'e-1', name: 'Test'};
            service.saveAndPushToEntityQueue(entity, 'TestSchema');

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockRepositoryFactory.getRepository).toHaveBeenCalledWith('TestSchema');
            expect(mockRepositoryFactory.getRepository).toHaveBeenCalledWith('EntityQueue');
            expect(mockDb.create).not.toHaveBeenCalled();
            expect(mockDb.write).not.toHaveBeenCalled();
        });

        it('deleteObjects uses transactionManager and db.delete', () => {
            const {mockDb, mockTransactionManager, mockContext, repositories} = createTestHarness();
            const service = new EntityService(mockDb, mockContext);

            const childObjects = [{uuid: 'child-1'}];
            const entity = {uuid: 'e-1', children: childObjects};
            repositories['TestSchema'] = createMockRepository();
            repositories['TestSchema'].findAll.mockReturnValue({
                filtered: jest.fn().mockReturnValue([entity])
            });

            service.deleteObjects('e-1', 'TestSchema', 'children');

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(childObjects);
        });

        it('deleteEntities uses transactionManager and db.delete', () => {
            const {mockDb, mockTransactionManager, mockContext} = createTestHarness();
            const service = new EntityService(mockDb, mockContext);

            const objects = [{uuid: '1'}, {uuid: '2'}];
            service.deleteEntities(objects);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(objects);
        });
    });

    describe('FamilyService', () => {
        it('register uses transactionManager and repository.create', () => {
            const {mockDb, mockTransactionManager, mockContext, mockRepositoryFactory} = createTestHarness();
            const service = new FamilyService(mockDb, mockContext);
            service.getSchema = () => 'Family';

            const family = {uuid: 'f-1', observations: []};
            service.register(family);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            const familyRepo = mockRepositoryFactory.getRepository('Family');
            expect(familyRepo.create).toHaveBeenCalledWith(family, true);
            expect(mockDb.create).not.toHaveBeenCalled();
        });
    });

    describe('CommentThreadService', () => {
        it('saveOrUpdate uses transactionManager and repository.create', () => {
            const {mockDb, mockTransactionManager, mockContext, mockRepositoryFactory} = createTestHarness();
            const service = new CommentThreadService(mockDb, mockContext);

            const thread = {uuid: 'ct-1'};
            service.saveOrUpdate(thread);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            const repo = mockRepositoryFactory.getRepository('CommentThread');
            expect(repo.create).toHaveBeenCalledWith(thread, true);
            expect(mockDb.create).not.toHaveBeenCalled();
        });
    });

    describe('CommentService', () => {
        it('saveOrUpdate uses transactionManager and repository.create', () => {
            const {mockDb, mockTransactionManager, mockContext, services, mockRepositoryFactory} = createTestHarness();
            const service = new CommentService(mockDb, mockContext);

            const mockIndividual = {uuid: 'ind-1', addComment: jest.fn()};
            const mockEntityService = {findByUUID: jest.fn().mockReturnValue(mockIndividual)};
            services[EntityService] = mockEntityService;
            mockContext.getService.mockImplementation((name) => {
                if (name === EntityService) return mockEntityService;
                return undefined;
            });

            const comment = {uuid: 'c-1', subject: {uuid: 'ind-1'}};
            service.saveOrUpdate(comment);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            const repo = mockRepositoryFactory.getRepository('Comment');
            expect(repo.create).toHaveBeenCalledWith(comment, true);
            expect(mockDb.create).not.toHaveBeenCalled();
        });
    });

    describe('DashboardCacheService', () => {
        it('updateCard uses transactionManager.write', () => {
            const {mockDb, mockTransactionManager, mockContext} = createTestHarness();
            const service = new DashboardCacheService(mockDb, mockContext);
            const mockCache = {setCard: jest.fn()};
            service.getCache = jest.fn().mockReturnValue(mockCache);

            service.updateCard({id: 'card-1'});

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockCache.setCard).toHaveBeenCalledWith({id: 'card-1'});
            expect(mockDb.write).not.toHaveBeenCalled();
        });

        it('updateFilter uses transactionManager.write', () => {
            const {mockDb, mockTransactionManager, mockContext} = createTestHarness();
            const service = new DashboardCacheService(mockDb, mockContext);
            const mockCache = {setFilter: jest.fn()};
            service.getCache = jest.fn().mockReturnValue(mockCache);

            service.updateFilter({id: 'filter-1'});

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockCache.setFilter).toHaveBeenCalledWith({id: 'filter-1'});
        });

        it('clear uses transactionManager.write and db.delete', () => {
            const {mockDb, mockTransactionManager, mockContext, repositories} = createTestHarness();
            const service = new DashboardCacheService(mockDb, mockContext);

            const cache = {uuid: 'dc-1'};
            repositories['DashboardCache'] = createMockRepository();
            repositories['DashboardCache'].findAll.mockReturnValue({
                filtered: jest.fn().mockReturnValue([cache]),
                length: 1,
                map: jest.fn().mockReturnValue([cache]),
                0: cache,
            });
            service.findOnly = jest.fn().mockReturnValue(cache);

            service.clear();

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockDb.delete).toHaveBeenCalledWith(cache);
        });
    });

    describe('TaskService', () => {
        it('saveOrUpdate uses transactionManager and repository.create', () => {
            const {mockDb, mockTransactionManager, mockContext, mockRepositoryFactory} = createTestHarness();
            const service = new TaskService(mockDb, mockContext);

            const task = {uuid: 't-1', observations: [], metadata: [], taskStatus: {isTerminal: false}};
            service.saveOrUpdate(task);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            const repo = mockRepositoryFactory.getRepository('Task');
            expect(repo.create).toHaveBeenCalledWith(task, true);
            expect(mockDb.create).not.toHaveBeenCalled();
        });

        it('deleteTask uses db.delete directly (called inside parent transaction)', () => {
            const {mockDb, mockContext, repositories} = createTestHarness();
            const service = new TaskService(mockDb, mockContext);

            const task = {uuid: 't-1'};
            repositories['Task'] = createMockRepository();
            repositories['Task'].findAll.mockReturnValue({
                filtered: jest.fn().mockReturnValue([task])
            });
            service.findByUUID = jest.fn().mockReturnValue(task);

            service.deleteTask('t-1');

            expect(mockDb.delete).toHaveBeenCalledWith(task);
        });
    });

    describe('TaskUnAssignmentService', () => {
        it('deleteUnassignedTasks uses transactionManager.write', () => {
            const {mockDb, mockTransactionManager, mockContext} = createTestHarness();
            const service = new TaskUnAssignmentService(mockDb, mockContext);

            const mockTaskService = {deleteTask: jest.fn()};
            mockContext.getService.mockImplementation((name) => {
                if (name === TaskService) return mockTaskService;
                return undefined;
            });

            const taskUnAssignments = [{taskUUID: 't-1', hasMigrated: false}];
            service.deleteUnassignedTasks(taskUnAssignments);

            expect(mockTransactionManager.write).toHaveBeenCalled();
            expect(mockTaskService.deleteTask).toHaveBeenCalledWith('t-1');
            expect(taskUnAssignments[0].hasMigrated).toBe(true);
        });
    });

    describe('No direct db.write or db.create in migrated services', () => {
        it('BaseService write methods never call db.write directly', () => {
            const {mockDb, mockTransactionManager, mockContext} = createTestHarness();

            const BaseService = require('../../src/service/BaseService').default;
            const service = new BaseService(mockDb, mockContext);
            service.getSchema = () => 'TestSchema';

            // saveOrUpdate
            service.saveOrUpdate({uuid: '1'});
            expect(mockDb.write).not.toHaveBeenCalled();
            expect(mockTransactionManager.write).toHaveBeenCalled();

            // save
            jest.clearAllMocks();
            service.save({uuid: '2'});
            expect(mockDb.write).not.toHaveBeenCalled();
            expect(mockTransactionManager.write).toHaveBeenCalled();

            // delete
            jest.clearAllMocks();
            service.delete({uuid: '3'});
            expect(mockDb.write).not.toHaveBeenCalled();
            expect(mockTransactionManager.write).toHaveBeenCalled();

            // deleteAll
            jest.clearAllMocks();
            service.deleteAll();
            expect(mockDb.write).not.toHaveBeenCalled();
            expect(mockTransactionManager.write).toHaveBeenCalled();

            // clearDataIn
            jest.clearAllMocks();
            service.clearDataIn([{schema: {name: 'TypeA'}}]);
            expect(mockDb.write).not.toHaveBeenCalled();
            expect(mockTransactionManager.write).toHaveBeenCalled();
        });
    });
});
