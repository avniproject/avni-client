/**
 * The policy behind the fast-sync peer cleanup: which of a restored dump's rows belong to the
 * uploader, which checkpoints go with them, and the order the two backends apply them in.
 *
 * Run: yarn jest test/service/fastSync/PeerOwnedDataTest.js --selectProjects unit --verbose
 */

const {
    DraftEncounter,
    DraftEnrolment,
    DraftProgramEncounter,
    DraftSubject,
    IdentifierAssignment,
    MyGroups,
    UserInfo,
    UserSubjectAssignment,
} = require('openchs-models');
const {
    clearPeerOwnedData,
    RealmPeerOwnedData,
    SqlitePeerOwnedData,
} = require('../../../src/service/fastSync/PeerOwnedData');

function recordingBackend() {
    const calls = [];
    return {
        calls,
        deletedRows: [],
        resetCheckpoints: null,
        inWrite(work) {
            calls.push('beginWrite');
            work();
            calls.push('endWrite');
        },
        deleteRows(schemaName) {
            calls.push(`deleteRows:${schemaName}`);
            this.deletedRows.push(schemaName);
        },
    };
}

function backendCapturingCheckpoints() {
    const backend = recordingBackend();
    backend.resetCheckpoints = (schemaNames) => {
        backend.calls.push('resetCheckpoints');
        backend.checkpointsReset = schemaNames;
    };
    return backend;
}

describe('peer-owned schemas on Realm', () => {
    it('clears the uploader\'s user info, identifiers, drafts, groups and subject assignments', () => {
        expect(RealmPeerOwnedData.rowSchemas).toEqual([
            UserInfo.schema.name,
            IdentifierAssignment.schema.name,
            DraftEncounter.schema.name,
            DraftSubject.schema.name,
            MyGroups.schema.name,
            UserSubjectAssignment.schema.name,
        ]);
    });

    it('resets the checkpoint of every schema it clears', () => {
        expect(RealmPeerOwnedData.checkpointSchemas).toEqual(RealmPeerOwnedData.rowSchemas);
    });
});

describe('peer-owned schemas on SQLite', () => {
    it('clears the uploader\'s groups, subject assignments, identifiers and drafts', () => {
        expect(SqlitePeerOwnedData.rowSchemas).toEqual([
            MyGroups.schema.name,
            UserSubjectAssignment.schema.name,
            IdentifierAssignment.schema.name,
            DraftSubject.schema.name,
            DraftEncounter.schema.name,
            DraftEnrolment.schema.name,
            DraftProgramEncounter.schema.name,
        ]);
    });

    it('resets the checkpoints of the synced entities it cleared, plus user info', () => {
        expect(SqlitePeerOwnedData.checkpointSchemas).toEqual([
            MyGroups.schema.name,
            UserSubjectAssignment.schema.name,
            IdentifierAssignment.schema.name,
            UserInfo.schema.name,
        ]);
    });

    // A checkpoint reset with no matching delete would re-pull data the dump already holds; a
    // delete with no reset leaves rows gone and never re-fetched. Drafts are the exception —
    // they are device-local and never synced, so they have no checkpoint of their own.
    it('resets a checkpoint only for the synced schemas it clears, and for user info', () => {
        const draftSchemas = [DraftSubject.schema.name, DraftEncounter.schema.name,
            DraftEnrolment.schema.name, DraftProgramEncounter.schema.name];
        const clearedAndSynced = SqlitePeerOwnedData.rowSchemas.filter(s => !draftSchemas.includes(s));

        expect(SqlitePeerOwnedData.checkpointSchemas)
            .toEqual([...clearedAndSynced, UserInfo.schema.name]);
    });
});

describe('the two backends\' lists differ on purpose', () => {
    // Recorded in review: SQLite widened the draft cleanup, Realm was left as it was.
    it('clears enrolment and program-encounter drafts on SQLite only', () => {
        [DraftEnrolment.schema.name, DraftProgramEncounter.schema.name].forEach(schemaName => {
            expect(SqlitePeerOwnedData.rowSchemas).toContain(schemaName);
            expect(RealmPeerOwnedData.rowSchemas).not.toContain(schemaName);
        });
    });

    // Realm deletes the row and writes the previous user's info back; SQLite keeps the row
    // because _stampLocalIdentity rewrites it in place. Only the checkpoint is peer-owned there.
    it('deletes the user info row on Realm but not on SQLite, while both drop its checkpoint', () => {
        expect(RealmPeerOwnedData.rowSchemas).toContain(UserInfo.schema.name);
        expect(SqlitePeerOwnedData.rowSchemas).not.toContain(UserInfo.schema.name);
        expect(RealmPeerOwnedData.checkpointSchemas).toContain(UserInfo.schema.name);
        expect(SqlitePeerOwnedData.checkpointSchemas).toContain(UserInfo.schema.name);
    });
});

describe('applying a policy to a backend', () => {
    const policy = {rowSchemas: ['Alpha', 'Beta', 'Gamma'], checkpointSchemas: ['Beta', 'Delta']};

    it('deletes every peer-owned schema\'s rows', () => {
        const backend = backendCapturingCheckpoints();

        clearPeerOwnedData(policy, backend);

        expect(backend.deletedRows).toEqual(['Alpha', 'Beta', 'Gamma']);
    });

    it('hands the checkpoint schemas to the backend exactly once', () => {
        const backend = backendCapturingCheckpoints();

        clearPeerOwnedData(policy, backend);

        expect(backend.checkpointsReset).toEqual(['Beta', 'Delta']);
        expect(backend.calls.filter(c => c === 'resetCheckpoints')).toHaveLength(1);
    });

    // SQLite's checkpoints are re-created by a seed that only fills gaps, so the uploader's rows
    // have to be gone before it runs.
    it('deletes rows before resetting checkpoints', () => {
        const backend = backendCapturingCheckpoints();

        clearPeerOwnedData(policy, backend);

        expect(backend.calls).toEqual([
            'beginWrite', 'deleteRows:Alpha', 'deleteRows:Beta', 'deleteRows:Gamma',
            'resetCheckpoints', 'endWrite']);
    });

    // A half-applied cleanup leaves the device holding some of the uploader's rows against its
    // own checkpoints, and nothing afterwards notices.
    it('does the whole cleanup in one write', () => {
        const backend = backendCapturingCheckpoints();

        clearPeerOwnedData(policy, backend);

        expect(backend.calls[0]).toEqual('beginWrite');
        expect(backend.calls[backend.calls.length - 1]).toEqual('endWrite');
        expect(backend.calls.filter(c => c === 'beginWrite')).toHaveLength(1);
    });
});

describe('clearing the uploader\'s caseload of directly assignable subject types', () => {
    const {EntitySyncStatus} = require('openchs-models');
    const {clearDirectlyAssignedSubjects} = require('../../../src/service/fastSync/PeerOwnedData');

    // Realm Results, near enough: .map is all the production code asks of them.
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

    function fakeServices({directlyAssignable = [], subjectsByType = {}, formMappingsByType = {}, checkpointRows = []} = {}) {
        const calls = [];
        const removedSubjects = [];
        const upserted = [];
        // getAll is what SubjectTypeService inherits from BaseService, and is the wrong answer
        // here: an openly-visible type's subjects are the same for everyone in the catchment.
        const allSubjectTypes = Object.keys(subjectsByType).map(uuid => ({uuid}));
        return {
            calls,
            removedSubjects,
            upserted,
            subjectTypeService: {
                getAllDirectlyAssignable: () => directlyAssignable,
                getAll: () => allSubjectTypes,
            },
            individualService: {
                getAllBySubjectType: (subjectType) => asResults(subjectsByType[subjectType.uuid] || []),
            },
            subjectMigrationService: {
                removeEntitiesFor: ({subjectUUID}) => {
                    calls.push(`removeEntitiesFor:${subjectUUID}`);
                    removedSubjects.push(subjectUUID);
                },
            },
            formMappingService: {
                getFormMappingsForSubjectType: (subjectType) => asResults(formMappingsByType[subjectType.uuid] || []),
            },
            entitySyncStatusService: {
                findAll: () => checkpointResults(checkpointRows),
                updateAsPerSyncDetails: (rows) => {
                    calls.push(`resetCheckpoints:${rows.map(r => r.uuid).join(',')}`);
                    upserted.push(...rows);
                },
            },
        };
    }

    const formMapping = (entityName, entityTypeUuid) => ({
        getEntityNameAndEntityTypeUUID: () => ({entityName, entityTypeUuid}),
    });

    const immediately = {inWrite: (work) => work()};

    it('removes every subject of a directly assignable type, and no other type\'s subjects', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            subjectsByType: {
                'st-assignable': [{uuid: 'sub-1'}, {uuid: 'sub-2'}],
                'st-open': [{uuid: 'sub-open'}],
            },
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.removedSubjects).toEqual(['sub-1', 'sub-2']);
    });

    it('removes nothing when no subject type is directly assignable', () => {
        const services = fakeServices({
            directlyAssignable: [],
            subjectsByType: {'st-open': [{uuid: 'sub-open'}]},
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.calls).toEqual([]);
    });

    // The device is only assigned some of the uploader's caseload, so the checkpoints of the
    // forms mapped to that type go back to the beginning of time and the pull re-fetches what
    // this user is actually assigned.
    it('puts the checkpoints of that type\'s form mappings back to the beginning of time', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            formMappingsByType: {'st-assignable': [formMapping('Individual', 'st-assignable')]},
            checkpointRows: [{uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'}],
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.upserted).toEqual([{
            uuid: 'cp-ind',
            entityName: 'Individual',
            entityTypeUuid: 'st-assignable',
            loadedSince: EntitySyncStatus.REALLY_OLD_DATE,
        }]);
    });

    // Rewritten, not deleted: the SQLite restore's gap-filling seed only inserts where no row
    // exists, and a deleted row for a privileged entity is one it will never put back.
    it('keeps each checkpoint row\'s own uuid and entity type', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            formMappingsByType: {'st-assignable': [formMapping('ProgramEncounter', 'enc-type')]},
            checkpointRows: [{uuid: 'cp-pe', entityName: 'ProgramEncounter', entityTypeUuid: 'enc-type'}],
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.upserted.map(r => [r.uuid, r.entityName, r.entityTypeUuid]))
            .toEqual([['cp-pe', 'ProgramEncounter', 'enc-type']]);
    });

    // The value of a fast-sync dump is its populated checkpoints; resetting the rest would undo it.
    it('leaves every checkpoint outside those form mappings alone', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            formMappingsByType: {'st-assignable': [formMapping('Individual', 'st-assignable')]},
            checkpointRows: [
                {uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'},
                {uuid: 'cp-ind-other', entityName: 'Individual', entityTypeUuid: 'st-open'},
                {uuid: 'cp-enc', entityName: 'Encounter', entityTypeUuid: 'st-assignable'},
            ],
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.upserted.map(r => r.uuid)).toEqual(['cp-ind']);
    });

    // Reset first and the pull could bring the subject back before the delete removed it.
    it('removes a type\'s subjects before resetting that type\'s checkpoints', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}]},
            formMappingsByType: {'st-assignable': [formMapping('Individual', 'st-assignable')]},
            checkpointRows: [{uuid: 'cp-ind', entityName: 'Individual', entityTypeUuid: 'st-assignable'}],
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.calls).toEqual(['removeEntitiesFor:sub-1', 'resetCheckpoints:cp-ind']);
    });

    it('does the whole cleanup inside the backend\'s write', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: 'sub-1'}]},
        });
        const inside = [];
        let openWrites = 0;
        let writeCount = 0;
        services.subjectMigrationService.removeEntitiesFor = () => inside.push(openWrites);

        clearDirectlyAssignedSubjects(services, {
            inWrite: (work) => {
                writeCount++;
                openWrites++;
                try { return work(); } finally { openWrites--; }
            },
        });

        expect(writeCount).toEqual(1);
        expect(inside).toEqual([1]);
    });

    it('skips a subject row that carries no uuid', () => {
        const assignable = {uuid: 'st-assignable'};
        const services = fakeServices({
            directlyAssignable: [assignable],
            subjectsByType: {'st-assignable': [{uuid: ''}, undefined, {uuid: 'sub-1'}]},
        });

        clearDirectlyAssignedSubjects(services, immediately);

        expect(services.removedSubjects).toEqual(['sub-1']);
    });
});
