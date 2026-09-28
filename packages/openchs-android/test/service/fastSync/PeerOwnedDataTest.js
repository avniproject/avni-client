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
