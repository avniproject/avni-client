/**
 * The Realm half of the fast-sync peer cleanup: it empties every peer-owned schema and puts each
 * of their sync checkpoints back to the beginning of time, keeping the checkpoint row's own uuid.
 *
 * Run: yarn jest test/service/BackupRestoreRealmServiceCleanupTest.js --selectProjects unit --verbose
 */

jest.mock('react-native-fs', () => ({
    __esModule: true,
    default: {DocumentDirectoryPath: '/docs', exists: jest.fn(), unlink: jest.fn(), copyFile: jest.fn()},
}));
jest.mock('react-native-zip-archive', () => ({unzip: jest.fn(), zip: jest.fn()}));
jest.mock('../../src/framework/http/requests', () => ({get: jest.fn(), getJSON: jest.fn()}));
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
