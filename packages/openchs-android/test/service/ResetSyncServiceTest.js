/**
 * Regression test for #2115 (a reset sync repeats forever when the sync after it
 * does not finish).
 *
 * The all-data branch wipes every entity including EntitySyncStatus, then calls
 * setup(), which re-seeds every checkpoint at REALLY_OLD_DATE — ResetSync's own
 * among them. From then on every sync re-pulls the user's entire reset history,
 * which is the mechanism the loop rides on. The reset has just been honoured;
 * re-downloading the instruction that caused it serves nothing.
 *
 * Contract: the wipe clears everything and re-seeds every OTHER checkpoint (the
 * first reset must still delete and re-download in full), but ResetSync's own
 * checkpoint survives with its original uuid and loadedSince.
 *
 * Run: npx jest test/service/ResetSyncServiceTest.js --selectProjects unit
 */

jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({
    zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()})),
}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false),
    setGenericPassword: jest.fn(async () => {}),
    resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {
        logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn(),
        randomUUID: () => 'generated-uuid',
    },
}));

const _ = require('lodash');
const {ResetSync, EntitySyncStatus} = require('openchs-models');
const ResetSyncService = require('../../src/service/ResetSyncService').default;

const REALLY_OLD_DATE = EntitySyncStatus.REALLY_OLD_DATE;
const RECENT = new Date('2026-09-02T14:03:15.000Z');

// Entities the app pulls, standing in for the real list. EntitySyncStatus is in the
// wipe (confirmed in the device log: "Deleting all data from EntitySyncStatus").
const PULLED_ENTITIES = ['ResetSync', 'Individual', 'Concept', 'ProgramEncounter'];

const makeResetSync = (uuid, {subjectTypeUUID = null, hasMigrated = false} = {}) => {
    const resetSync = new ResetSync();
    resetSync.uuid = uuid;
    resetSync.voided = false;
    resetSync.subjectTypeUUID = subjectTypeUUID;
    resetSync.hasMigrated = hasMigrated;
    return resetSync;
};

// Minimal stand-in for a Realm results handle: enough of filtered()/map() for the
// two queries the service makes.
const resultsOver = (rows, predicates) => ({
    filtered: (query, ...args) => resultsOver(rows.filter(row => predicates(query, args, row)), predicates),
    map: (fn) => rows.map(fn),
});

function buildService({resetSyncs, checkpoints, neverSynced = false}) {
    const service = Object.create(ResetSyncService.prototype);
    const state = {
        resetSyncs,
        statusRows: checkpoints.map(row => ({...row})),
        clearedSchemas: null,
        deletedEntries: [],
        deletedSubjects: [],
    };

    service.backupRestoreRealmService = {isDatabaseNeverSynced: () => neverSynced};

    service.getAllNonVoided = () => resultsOver(
        state.resetSyncs,
        (query, _args, row) => query !== 'hasMigrated = false' || row.hasMigrated === false);

    service.update = (entity) => {
        const row = _.find(state.resetSyncs, r => r.uuid === entity.uuid);
        if (row) row.hasMigrated = entity.hasMigrated;
    };

    service.clearDataIn = (entityTypes) => {
        state.clearedSchemas = entityTypes.map(entityType => entityType.schema.name);
        // The real wipe deletes EntitySyncStatus rows along with everything else.
        if (state.clearedSchemas.includes(EntitySyncStatus.schema.name)) state.statusRows = [];
    };

    service.entitySyncStatusService = {
        get: (entityName) => _.find(state.statusRows, row => row.entityName === entityName),
        // Mirrors EntitySyncStatusService.setup(): create a REALLY_OLD_DATE row, with a
        // fresh uuid, for every pulled entity that has no row.
        setup: jest.fn(() => {
            PULLED_ENTITIES.forEach(entityName => {
                if (!_.find(state.statusRows, row => row.entityName === entityName)) {
                    state.statusRows.push({
                        entityName, uuid: `seeded-${entityName}`,
                        entityTypeUuid: '', loadedSince: REALLY_OLD_DATE,
                    });
                }
            });
        }),
        updateAsPerSyncDetails: jest.fn((details) => {
            details.forEach(({uuid, entityName, loadedSince, entityTypeUuid}) => {
                const existing = _.find(state.statusRows, row => row.uuid === uuid);
                if (existing) Object.assign(existing, {entityName, loadedSince, entityTypeUuid});
                else state.statusRows.push({uuid, entityName, loadedSince, entityTypeUuid});
            });
        }),
        deleteEntries: jest.fn((criteria) => state.deletedEntries.push(criteria)),
    };

    service.individualService = {
        findAll: () => resultsOver([], () => true),
    };
    service.subjectMigrationService = {
        deleteSubjectAndChildren: jest.fn(subject => state.deletedSubjects.push(subject)),
    };

    return {service, state};
}

const catchmentCheckpoints = () => [
    {entityName: 'ResetSync', uuid: 'reset-sync-checkpoint', entityTypeUuid: '', loadedSince: RECENT},
    {entityName: 'Individual', uuid: 'individual-checkpoint', entityTypeUuid: '', loadedSince: RECENT},
    {entityName: 'Concept', uuid: 'concept-checkpoint', entityTypeUuid: '', loadedSince: RECENT},
];

const resetSyncStatus = (state) => _.filter(state.statusRows, row => row.entityName === 'ResetSync');

describe('ResetSyncService — a catchment reset must not re-arm itself (#2115)', () => {

    describe('the all-data branch', () => {
        it('keeps the ResetSync checkpoint, so the next sync does not re-pull the honoured reset', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1')],
                checkpoints: catchmentCheckpoints(),
            });

            service.resetSync();

            const resetSyncRows = resetSyncStatus(state);
            expect(resetSyncRows).toHaveLength(1);
            expect(resetSyncRows[0].loadedSince).toEqual(RECENT);
            expect(resetSyncRows[0].uuid).toBe('reset-sync-checkpoint');
        });

        it('still re-seeds every other checkpoint, so the first reset re-downloads in full', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1')],
                checkpoints: catchmentCheckpoints(),
            });

            service.resetSync();

            expect(service.entitySyncStatusService.setup).toHaveBeenCalled();
            ['Individual', 'Concept', 'ProgramEncounter'].forEach(entityName => {
                const row = _.find(state.statusRows, r => r.entityName === entityName);
                expect(row.loadedSince).toEqual(REALLY_OLD_DATE);
            });
        });

        it('still wipes the data, and still spares Settings, UserInfo and ResetSync', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1')],
                checkpoints: catchmentCheckpoints(),
            });

            service.resetSync();

            expect(state.clearedSchemas).toContain('EntitySyncStatus');
            expect(state.clearedSchemas).toContain('Individual');
            expect(state.clearedSchemas).not.toContain('Settings');
            expect(state.clearedSchemas).not.toContain('UserInfo');
            expect(state.clearedSchemas).not.toContain('ResetSync');
        });

        it('marks the reset migrated, because the wipe is what satisfies it', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1')],
                checkpoints: catchmentCheckpoints(),
            });

            service.resetSync();

            expect(state.resetSyncs[0].hasMigrated).toBe(true);
        });

        // AC 3. The acceptance criterion a wrong fix passes: stopping the loop by never
        // resetting again is not a fix.
        it('still fires for a genuinely new reset that arrives after the checkpoint was kept', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1', {hasMigrated: true})],
                checkpoints: catchmentCheckpoints(),
            });

            service.resetSync();
            expect(state.clearedSchemas).toBeNull();

            state.resetSyncs.push(makeResetSync('reset-2'));
            service.resetSync();

            expect(state.clearedSchemas).toContain('Individual');
            expect(state.resetSyncs[1].hasMigrated).toBe(true);
            expect(resetSyncStatus(state)[0].loadedSince).toEqual(RECENT);
        });
    });

    // AC 5. A sync-attribute change on one subject type takes the other branch. It does
    // not loop today and must not start.
    describe('the per-subject-type branch', () => {
        it('deletes only that subject type\'s checkpoints and never touches ResetSync\'s', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1', {subjectTypeUUID: 'subject-type-1'})],
                checkpoints: catchmentCheckpoints(),
            });

            service.resetSync();

            expect(state.clearedSchemas).toBeNull();
            expect(state.deletedEntries).toEqual([`entityTypeUuid = 'subject-type-1'`]);
            expect(resetSyncStatus(state)[0].loadedSince).toEqual(RECENT);
            expect(state.resetSyncs[0].hasMigrated).toBe(true);
        });
    });

    describe('a device that has never synced', () => {
        it('marks resets migrated and skips the wipe', () => {
            const {service, state} = buildService({
                resetSyncs: [makeResetSync('reset-1')],
                checkpoints: catchmentCheckpoints(),
                neverSynced: true,
            });

            service.resetSync();

            expect(state.clearedSchemas).toBeNull();
            expect(state.resetSyncs[0].hasMigrated).toBe(true);
        });
    });
});
