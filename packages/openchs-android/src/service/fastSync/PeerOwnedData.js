import _ from 'lodash';
import {
    DraftEncounter,
    DraftEnrolment,
    DraftProgramEncounter,
    DraftSubject,
    EntitySyncStatus,
    IdentifierAssignment,
    MyGroups,
    UserInfo,
    UserSubjectAssignment
} from 'openchs-models';

/**
 * A restored fast sync dump is another field worker's database, so some of what it holds belongs
 * to whoever uploaded it and not to whoever restores it: their group memberships, their subject
 * assignments, their unsaved drafts, and the identifiers pre-allocated to their device — kept,
 * both devices hand out the same number and one registration overwrites the other.
 *
 * `rowSchemas` are the records themselves. `checkpointSchemas` are the entities whose
 * EntitySyncStatus still carries the uploader's loadedSince; left as they are, the next sync asks
 * for changes since the uploader's last sync and never re-pulls what was just deleted.
 *
 * The two backends run the same policy through different mechanisms, so each supplies its own
 * backend object; the lists and the reasoning live here so the two cannot drift apart.
 */

// Realm deletes the row and writes the previous user's info back afterwards, so UserInfo is a
// row schema here and only a checkpoint schema on SQLite.
export const RealmPeerOwnedData = {
    rowSchemas: [
        UserInfo.schema.name,
        IdentifierAssignment.schema.name,
        DraftEncounter.schema.name,
        DraftSubject.schema.name,
        MyGroups.schema.name,
        UserSubjectAssignment.schema.name,
    ],
    checkpointSchemas: [
        UserInfo.schema.name,
        IdentifierAssignment.schema.name,
        DraftEncounter.schema.name,
        DraftSubject.schema.name,
        MyGroups.schema.name,
        UserSubjectAssignment.schema.name,
    ],
};

// Wider on drafts than Realm by decision, and keeps the UserInfo row because _stampLocalIdentity
// rewrites it in place; only the uploader's UserInfo checkpoint has to go, or /v2/me is asked for
// changes newer than this user's own record and never returns it.
export const SqlitePeerOwnedData = {
    rowSchemas: [
        MyGroups.schema.name,
        UserSubjectAssignment.schema.name,
        IdentifierAssignment.schema.name,
        DraftSubject.schema.name,
        DraftEncounter.schema.name,
        DraftEnrolment.schema.name,
        DraftProgramEncounter.schema.name,
    ],
    checkpointSchemas: [
        MyGroups.schema.name,
        UserSubjectAssignment.schema.name,
        IdentifierAssignment.schema.name,
        UserInfo.schema.name,
    ],
};

/**
 * `backend` supplies the mechanism:
 *   inWrite(work)               — run `work` in one write transaction
 *   deleteRows(schemaName)      — delete every row of that schema
 *   resetCheckpoints(schemaNames) — put those entities' sync status back to the beginning of time
 *
 * Rows go before checkpoints: on SQLite the checkpoints are re-created by a seed that only fills
 * gaps, so the uploader's rows have to be gone before it runs.
 */
export function clearPeerOwnedData(policy, backend) {
    backend.inWrite(() => {
        policy.rowSchemas.forEach(schemaName => backend.deleteRows(schemaName));
        backend.resetCheckpoints(policy.checkpointSchemas);
    });
}

/**
 * Directly assignable subject types are assigned to named field workers, so two users in the same
 * catchment hold different subjects of the same type and a shared dump carries the uploader's
 * caseload. Which types those are is configuration read at runtime, not a list that could sit
 * beside rowSchemas.
 *
 * Every step here is a bean the registry has already bound to the active database, so both
 * backends share the whole of it. `backend` is left with one job:
 *   inWrite(work) — run `work` in one write transaction, or run it as it comes where the
 *                   backend cannot nest the writes the services open for themselves.
 *
 * The checkpoints are rewritten in place rather than deleted, keeping each row's own uuid: the
 * SQLite restore's baseline seed only inserts where no row exists, and these entities are
 * privilege-scoped, so a deleted row is one nothing would put back.
 */
export function clearDirectlyAssignedSubjects(services, backend) {
    const {subjectTypeService, individualService, subjectMigrationService, formMappingService,
        entitySyncStatusService} = services;
    backend.inWrite(() => {
        _.forEach(subjectTypeService.getAllDirectlyAssignable(), subjectType => {
            _.forEach(individualService.getAllBySubjectType(subjectType).map(_.identity), individual => {
                const subjectUUID = _.get(individual, 'uuid');
                if (!_.isEmpty(subjectUUID)) subjectMigrationService.removeEntitiesFor({subjectUUID});
            });
            _.forEach(formMappingService.getFormMappingsForSubjectType(subjectType).map(_.identity), formMapping => {
                const {entityName, entityTypeUuid} = formMapping.getEntityNameAndEntityTypeUUID();
                const checkpoints = entitySyncStatusService.findAll()
                    .filtered('entityName = $0', entityName)
                    .filtered('entityTypeUuid = $0', entityTypeUuid)
                    .map(({uuid, entityName, entityTypeUuid}) =>
                        ({uuid, entityName, entityTypeUuid, loadedSince: EntitySyncStatus.REALLY_OLD_DATE}));
                if (!_.isEmpty(checkpoints)) entitySyncStatusService.updateAsPerSyncDetails(checkpoints);
            });
        });
    });
}
