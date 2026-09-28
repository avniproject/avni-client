/**
 * The Realm half of the fast-sync peer cleanup: it empties every peer-owned schema and puts each
 * of their sync checkpoints back to the beginning of time, keeping the checkpoint row's own uuid.
 *
 * Run: yarn jest test/service/BackupRestoreRealmServiceCleanupTest.js --selectProjects unit --verbose
 */

jest.mock('react-native-fs', () => ({
    __esModule: true,
    default: {
        DocumentDirectoryPath: '/docs',
        exists: jest.fn(async () => false),
        unlink: jest.fn(async () => {}),
        copyFile: jest.fn(async () => {}),
        moveFile: jest.fn(async () => {}),
        readDir: jest.fn(async () => [{name: 'dump.realm', path: '/docs/unzipped/dump.realm'}]),
    },
}));
jest.mock('react-native-zip-archive', () => ({unzip: jest.fn(async () => {}), zip: jest.fn()}));
const mockPost = jest.fn(async () => { throw new Error('no syncable items stubbed'); });
const mockGet = jest.fn();
jest.mock('../../src/framework/http/requests', () => ({
    get: (...args) => mockGet(...args), getJSON: jest.fn(), post: (...args) => mockPost(...args),
}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {
        logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(),
        logErrorAsInfo: jest.fn(), randomUUID: jest.fn(() => 'random-uuid'),
    },
}));
jest.mock('../../src/utility/FileLoggerService', () => ({__esModule: true, default: class FileLoggerService {}}));
jest.mock('../../src/model/FileSystem', () => ({__esModule: true, default: {getBackupDir: () => '/backup'}}));
jest.mock('../../src/framework/bean/Service', () => () => () => {});
jest.mock('../../src/service/BaseService', () => ({
    __esModule: true,
    default: class {
        constructor(db, context) {
            this.db = db;
            this.context = context;
        }
        getService(service) {
            return this.context.getService(service);
        }
        getRepository(schemaName) {
            return this.context.getRepository(schemaName);
        }
        get transactionManager() {
            return this.context.transactionManager;
        }
    },
}));

const BackupRestoreRealmService = require('../../src/service/BackupRestoreRealmService').default;
const {DraftEncounter, DraftSubject, EntitySyncStatus, IdentifierAssignment, MyGroups, UserInfo,
    UserSubjectAssignment} = require('openchs-models');

function fakeRealm(syncStatusRows) {
    const emptied = [];
    const upserted = [];
    let writeCount = 0;
    let openWrites = 0;
    let maxWriteDepth = 0;

    const syncStatusResults = {
        filtered: (query) => {
            const [, schemaName] = /^entityName = '(.+)'$/.exec(query) || [];
            if (!schemaName) throw new Error(`fake EntitySyncStatus query not understood: ${query}`);
            const matching = syncStatusRows.filter(r => r.entityName === schemaName);
            return {map: (fn) => matching.map(fn)};
        },
    };

    const repositoryFor = (schemaName) => ({
        findAll: () => (schemaName === EntitySyncStatus.schema.name ? syncStatusResults : {schemaName}),
        deleteInTransaction: (results) => {
            if (openWrites === 0) throw new Error('deleted outside a write transaction');
            emptied.push(results.schemaName);
        },
        create: (entity) => {
            if (openWrites === 0) throw new Error('created outside a write transaction');
            upserted.push(entity);
        },
    });

    return {
        emptied,
        upserted,
        get writeCount() { return writeCount; },
        get maxWriteDepth() { return maxWriteDepth; },
        context: {
            getService: () => undefined,
            getRepository: repositoryFor,
            transactionManager: {
                write: (work) => {
                    writeCount++;
                    openWrites++;
                    maxWriteDepth = Math.max(maxWriteDepth, openWrites);
                    try {
                        return work();
                    } finally {
                        openWrites--;
                    }
                },
            },
        },
    };
}

function serviceOn(realm) {
    return new BackupRestoreRealmService({}, realm.context);
}

const PEER_OWNED = [UserInfo.schema.name, IdentifierAssignment.schema.name, DraftEncounter.schema.name,
    DraftSubject.schema.name, MyGroups.schema.name, UserSubjectAssignment.schema.name];

describe('Realm fast-sync restore clears a peer database of its owner', () => {
    it('empties the uploader\'s user info, identifiers, drafts, groups and subject assignments', () => {
        const realm = fakeRealm([]);

        serviceOn(realm)._clearPeerOwnedData();

        expect(realm.emptied.sort()).toEqual([...PEER_OWNED].sort());
    });

    it('puts the checkpoint of every schema it empties back to the beginning of time', () => {
        const rows = PEER_OWNED.map((entityName, i) => ({
            uuid: `sync-${i}`, entityName, entityTypeUuid: `type-${i}`,
        }));
        const realm = fakeRealm(rows);

        serviceOn(realm)._clearPeerOwnedData();

        expect(realm.upserted.map(e => e.entityName).sort()).toEqual([...PEER_OWNED].sort());
        realm.upserted.forEach(entity => {
            expect(entity.loadedSince).toEqual(EntitySyncStatus.REALLY_OLD_DATE);
        });
    });

    // A new uuid would leave the uploader's checkpoint row behind as a second row for the entity.
    it('keeps each checkpoint row\'s own uuid and entity type', () => {
        const realm = fakeRealm([
            {uuid: 'groups-checkpoint', entityName: MyGroups.schema.name, entityTypeUuid: 'group-type'},
        ]);

        serviceOn(realm)._clearPeerOwnedData();

        expect(realm.upserted).toHaveLength(1);
        expect(realm.upserted[0]).toMatchObject({
            uuid: 'groups-checkpoint',
            entityName: MyGroups.schema.name,
            entityTypeUuid: 'group-type',
        });
    });

    // The value of a fast-sync dump is its populated checkpoints; resetting them all would undo it.
    it('leaves the checkpoints of everything else alone', () => {
        const realm = fakeRealm([
            {uuid: 'ui1', entityName: UserInfo.schema.name, entityTypeUuid: null},
            {uuid: 'i1', entityName: 'Individual', entityTypeUuid: null},
            {uuid: 'pe1', entityName: 'ProgramEncounter', entityTypeUuid: 'et1'},
        ]);

        serviceOn(realm)._clearPeerOwnedData();

        expect(realm.upserted.map(e => e.uuid)).toEqual(['ui1']);
    });

    // Half-applied, the device holds some of the uploader's rows against its own checkpoints.
    it('does the whole cleanup in one write transaction', () => {
        const realm = fakeRealm([{uuid: 'g1', entityName: MyGroups.schema.name, entityTypeUuid: null}]);

        serviceOn(realm)._clearPeerOwnedData();

        expect(realm.writeCount).toEqual(1);
        expect(realm.maxWriteDepth).toEqual(1);
    });
});

describe('Realm fast-sync restore clears a peer\'s directly assigned caseload', () => {
    const SubjectTypeService = require('../../src/service/SubjectTypeService').default;
    const IndividualService = require('../../src/service/IndividualService').default;
    const SubjectMigrationService = require('../../src/service/SubjectMigrationService').default;
    const FormMappingService = require('../../src/service/FormMappingService').default;
    const EntitySyncStatusService = require('../../src/service/EntitySyncStatusService').default;

    const asResults = (rows) => ({map: (fn) => rows.map(fn)});

    function checkpointResults(rows) {
        return {
            filtered(query, arg) {
                const [, field] = /^\s*(\w+)\s*=\s*\$0\s*$/.exec(query) || [];
                if (!field) throw new Error(`fake checkpoint query not understood: ${query}`);
                return checkpointResults(rows.filter(r => r[field] === arg));
            },
            map: (fn) => rows.map(fn),
        };
    }

    const profileFormMapping = (subjectTypeUuid) => ({
        getEntityNameAndEntityTypeUUID: () => ({entityName: 'Individual', entityTypeUuid: subjectTypeUuid}),
    });

    function serviceWith({directlyAssignable = [], subjectsByType = {}, formMappingsByType = {},
        checkpointRows = []} = {}) {
        const removedSubjects = [];
        const resetCheckpoints = [];
        const services = new Map([
            [SubjectTypeService, {
                getAllDirectlyAssignable: () => directlyAssignable,
                getAll: () => Object.keys(subjectsByType).map(uuid => ({uuid})),
            }],
            [IndividualService, {getAllBySubjectType: (st) => asResults(subjectsByType[st.uuid] || [])}],
            [SubjectMigrationService, {removeEntitiesFor: ({subjectUUID}) => removedSubjects.push(subjectUUID)}],
            [FormMappingService, {getFormMappingsForSubjectType: (st) => asResults(formMappingsByType[st.uuid] || [])}],
            [EntitySyncStatusService, {
                findAll: () => checkpointResults(checkpointRows),
                updateAsPerSyncDetails: (rows) => resetCheckpoints.push(...rows),
            }],
        ]);
        const service = new BackupRestoreRealmService({}, {getService: (cls) => services.get(cls)});
        return {service, removedSubjects, resetCheckpoints};
    }

    const assignable = {uuid: 'st-assignable'};

    it('removes the uploader\'s subjects of a directly assignable type and no others', () => {
        const {service, removedSubjects} = serviceWith({
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}], 'st-open': [{uuid: 'sub-open'}]},
        });

        service._deleteIndividualAndDependentForDirectlyAssignableSubjectTypes();

        expect(removedSubjects).toEqual(['sub-1']);
    });

    it('puts that type\'s checkpoints back to the beginning of time, keeping their uuids', () => {
        const {service, resetCheckpoints} = serviceWith({
            directlyAssignable: [assignable],
            formMappingsByType: {'st-assignable': [profileFormMapping('st-assignable')]},
            checkpointRows: [
                {uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'},
                {uuid: 'cp-open', entityName: 'Individual', entityTypeUuid: 'st-open'},
            ],
        });

        service._deleteIndividualAndDependentForDirectlyAssignableSubjectTypes();

        expect(resetCheckpoints).toEqual([{
            uuid: 'cp-ind',
            entityName: 'Individual',
            entityTypeUuid: 'st-assignable',
            loadedSince: EntitySyncStatus.REALLY_OLD_DATE,
        }]);
    });
});

describe('Realm fast-sync restore reconciles a peer\'s dump with this user\'s privileges', () => {
    const SettingsService = require('../../src/service/SettingsService').default;
    const SubjectTypeService = require('../../src/service/SubjectTypeService').default;
    const IndividualService = require('../../src/service/IndividualService').default;
    const SubjectMigrationService = require('../../src/service/SubjectMigrationService').default;
    const FormMappingService = require('../../src/service/FormMappingService').default;
    const EntitySyncStatusService = require('../../src/service/EntitySyncStatusService').default;

    beforeEach(() => {
        mockPost.mockReset();
        mockPost.mockImplementation(async () => { throw new Error('no syncable items stubbed'); });
    });

    const asResults = (rows) => ({map: (fn) => rows.map(fn)});
    const answerWith = (syncDetails) => mockPost.mockResolvedValue({json: async () => ({syncDetails})});
    const individualItem = (entityTypeUuid) => ({entityName: 'Individual', entityTypeUuid});

    function serviceWith({subjectsByType = {}, formMappingsByType = {}, checkpointRows = []} = {}) {
        const removedSubjects = [];
        const resetCheckpoints = [];
        const services = new Map([
            [SettingsService, {getSettings: () => ({serverURL: 'https://server'})}],
            [SubjectTypeService, {
                getAllDirectlyAssignable: () => [],
                getAll: () => Object.keys(subjectsByType).map(uuid => ({uuid})),
            }],
            [IndividualService, {getAllBySubjectType: (st) => asResults(subjectsByType[st.uuid] || [])}],
            [SubjectMigrationService, {removeEntitiesFor: ({subjectUUID}) => removedSubjects.push(subjectUUID)}],
            [FormMappingService, {getFormMappingsForSubjectType: (st) => asResults(formMappingsByType[st.uuid] || [])}],
            [EntitySyncStatusService, {
                findAll: () => asResults(checkpointRows),
                updateAsPerSyncDetails: (rows) => resetCheckpoints.push(...rows),
            }],
        ]);
        const service = new BackupRestoreRealmService({}, {getService: (cls) => services.get(cls)});
        return {service, removedSubjects, resetCheckpoints};
    }

    it('removes the subjects of a type this user has no privilege on', async () => {
        const {service, removedSubjects} = serviceWith({
            subjectsByType: {'st-mine': [{uuid: 'sub-mine'}], 'st-household': [{uuid: 'sub-theirs'}]},
        });
        answerWith([individualItem('st-mine')]);

        await service._clearEntitiesOutsidePrivileges();

        expect(removedSubjects).toEqual(['sub-theirs']);
    });

    it('puts the removed type\'s checkpoints back to the beginning of time', async () => {
        const {service, resetCheckpoints} = serviceWith({
            subjectsByType: {'st-mine': [], 'st-household': []},
            checkpointRows: [
                {uuid: 'cp-mine', entityName: 'Individual', entityTypeUuid: 'st-mine'},
                {uuid: 'cp-theirs', entityName: 'Individual', entityTypeUuid: 'st-household'},
            ],
        });
        answerWith([individualItem('st-mine')]);

        await service._clearEntitiesOutsidePrivileges();

        expect(resetCheckpoints).toEqual([{uuid: 'cp-theirs', entityName: 'Individual',
            entityTypeUuid: 'st-household', loadedSince: new Date('1900-01-01T00:00:00.000Z')}]);
    });

    // Deleting on a response that never arrived would destroy data this user is entitled to.
    it('deletes nothing when the syncable item list cannot be fetched', async () => {
        const {service, removedSubjects, resetCheckpoints} = serviceWith({
            subjectsByType: {'st-household': [{uuid: 'sub-theirs'}]},
            checkpointRows: [{uuid: 'cp-theirs', entityName: 'Individual', entityTypeUuid: 'st-household'}],
        });
        mockPost.mockRejectedValue(new Error('offline'));

        await service._clearEntitiesOutsidePrivileges();

        expect(removedSubjects).toEqual([]);
        expect(resetCheckpoints).toEqual([]);
    });
});

describe('the Realm restore runs the privilege reconciliation itself', () => {
    const SettingsService = require('../../src/service/SettingsService').default;
    const MediaService = require('../../src/service/MediaService').default;
    const SubjectTypeService = require('../../src/service/SubjectTypeService').default;
    const IndividualService = require('../../src/service/IndividualService').default;
    const SubjectMigrationService = require('../../src/service/SubjectMigrationService').default;
    const FormMappingService = require('../../src/service/FormMappingService').default;
    const EntitySyncStatusService = require('../../src/service/EntitySyncStatusService').default;
    const UserInfoService = require('../../src/service/UserInfoService').default;

    const asResults = (rows) => ({map: (fn) => rows.map(fn)});

    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockImplementation(async (url) => url.endsWith('/exists') ? 'true' : 'https://signed-url');
        mockPost.mockResolvedValue({json: async () => ({syncDetails: [{entityName: 'Individual', entityTypeUuid: 'st-mine'}]})});
    });

    function buildForRestore({subjectsByType = {}} = {}) {
        const removedSubjects = [];
        const settingsService = {
            getSettings: () => ({serverURL: 'https://server', userId: 'aw@org', clone() { return {...this}; }}),
            saveOrUpdate: jest.fn(),
        };
        const services = new Map([
            [SettingsService, settingsService],
            [MediaService, {downloadFromUrl: jest.fn(async () => {})}],
            [EntitySyncStatusService, {
                setup: jest.fn(),
                findAll: () => asResults([]),
                updateAsPerSyncDetails: jest.fn(),
            }],
            [UserInfoService, {saveOrUpdate: jest.fn()}],
            [SubjectTypeService, {
                getAllDirectlyAssignable: () => [],
                getAll: () => Object.keys(subjectsByType).map(uuid => ({uuid})),
            }],
            [IndividualService, {getAllBySubjectType: (st) => asResults(subjectsByType[st.uuid] || [])}],
            [SubjectMigrationService, {removeEntitiesFor: ({subjectUUID}) => removedSubjects.push(subjectUUID)}],
            [FormMappingService, {getFormMappingsForSubjectType: () => asResults([])}],
        ]);
        const context = {
            getService: (cls) => services.get(cls),
            getRepository: () => ({findAll: () => ({filtered: () => ({map: () => []}), map: () => []}),
                deleteInTransaction: jest.fn(), create: jest.fn()}),
            transactionManager: {write: (work) => work()},
        };
        const service = new BackupRestoreRealmService({}, context);
        service.subscribeOnRestore(jest.fn(async () => {}));
        service.subscribeOnRestoreFailure(jest.fn(async () => {}));
        return {service, removedSubjects};
    }

    async function restore(service) {
        const messages = [];
        await new Promise((resolve) => {
            service.restore((progress, message, failed, error) => {
                messages.push([progress, message, failed, error]);
                if (progress === 100) resolve();
            });
        });
        return messages[messages.length - 1];
    }

    // The reconciliation is worth nothing unless the restore that creates the leak performs it.
    it('removes a subject type this user has no privilege on during a real restore', async () => {
        const {service, removedSubjects} = buildForRestore({
            subjectsByType: {'st-mine': [{uuid: 'sub-mine'}], 'st-household': [{uuid: 'sub-theirs'}]},
        });

        const last = await restore(service);

        expect(last.slice(0, 2)).toEqual([100, 'restoreComplete']);
        expect(removedSubjects).toEqual(['sub-theirs']);
    });

    // The request carries this user's own credentials, which _restoreSettings puts back after the
    // dump's own Settings row has replaced them.
    it('asks the server only after the previous settings have been restored', async () => {
        const {service} = buildForRestore({subjectsByType: {'st-mine': []}});
        const settingsService = service.getService(SettingsService);

        await restore(service);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(settingsService.saveOrUpdate.mock.invocationCallOrder[0])
            .toBeLessThan(mockPost.mock.invocationCallOrder[0]);
    });
});
