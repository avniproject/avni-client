import _ from 'lodash';
import {
    DraftEncounter,
    DraftEnrolment,
    DraftProgramEncounter,
    DraftSubject,
    EntitySyncStatus,
    IdentifierAssignment,
    Individual,
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

const syncableItemKey = (entityName, entityTypeUuid) => `${entityName}|${entityTypeUuid || ''}`;

/**
 * Deleting on an allowlist that never arrived, or arrived short, would destroy data the restoring
 * user is entitled to — far worse than carrying a peer's rows until the next sync clears them. So
 * anything less than a well-formed list naming at least one subject type means: change nothing.
 *
 * A catchment dump is only ever restored by someone whose group grants ViewSubject on something,
 * so a list with no subject type in it is a reply that has lost entries, not a user with none.
 */
export function isUsableSyncableItemList(syncableItems) {
    if (!_.isArray(syncableItems) || _.isEmpty(syncableItems)) return false;
    if (!_.every(syncableItems, item => _.isObject(item) && _.isString(item.entityName) && !_.isEmpty(item.entityName))) return false;
    return _.some(syncableItems, ({entityName, entityTypeUuid}) =>
        entityName === Individual.schema.name && !_.isEmpty(entityTypeUuid));
}

/**
 * Which entity types a user may sync at all is decided by their group privileges, and two workers
 * sharing a catchment need not share them. A catchment dump holds whatever its uploader could see,
 * so a restore can leave the device with subject types this user's own sync would never fetch and
 * nothing would ever remove.
 *
 * `syncableItems` is that user's own allowlist of {entityName, entityTypeUuid} pairs. Reconciling
 * is by entity type, never by row: a subject type the allowlist does not name goes, with the
 * encounters, enrolments and checklists that hang off its subjects.
 *
 * The checkpoints are rewritten in place keeping each row's own uuid, as clearDirectlyAssignedSubjects
 * does and for the same reason — these rows are privilege-scoped, one per entityTypeUuid, and the
 * baseline seed only ever inserts unscoped ones, so a deleted row is one nothing puts back. Left at
 * the uploader's loadedSince they would claim the removed type was already pulled, and a user later
 * granted the privilege would never re-fetch it.
 *
 * `services` are beans the registry has already bound to the active database; `backend` supplies
 * only inWrite(work), as clearDirectlyAssignedSubjects does.
 */
export function clearEntitiesOutsidePrivileges(syncableItems, services, backend) {
    if (!isUsableSyncableItemList(syncableItems)) return {reconciled: false, removedSubjectTypes: []};

    const allowed = new Set(_.map(syncableItems, ({entityName, entityTypeUuid}) =>
        syncableItemKey(entityName, entityTypeUuid)));
    const {subjectTypeService, individualService, subjectMigrationService, formMappingService,
        entitySyncStatusService} = services;
    const removedSubjectTypes = [];

    backend.inWrite(() => {
        _.forEach(subjectTypeService.getAll().map(_.identity), subjectType => {
            const subjectTypeUUID = _.get(subjectType, 'uuid');
            if (_.isEmpty(subjectTypeUUID)) return;
            if (allowed.has(syncableItemKey(Individual.schema.name, subjectTypeUUID))) return;
            removedSubjectTypes.push(subjectType);
            _.forEach(individualService.getAllBySubjectType(subjectType).map(_.identity), individual => {
                const subjectUUID = _.get(individual, 'uuid');
                if (!_.isEmpty(subjectUUID)) subjectMigrationService.removeEntitiesFor({subjectUUID});
            });
        });
        if (_.isEmpty(removedSubjectTypes)) return;

        const removedTypeUuids = new Set(_.map(removedSubjectTypes, 'uuid'));
        // The subjects took their encounters and enrolments with them, and those checkpoints are
        // keyed by encounter type and programme rather than by subject type.
        const staleKeys = new Set();
        _.forEach(removedSubjectTypes, subjectType => {
            _.forEach(formMappingService.getFormMappingsForSubjectType(subjectType).map(_.identity), formMapping => {
                const {entityName, entityTypeUuid} = formMapping.getEntityNameAndEntityTypeUUID();
                staleKeys.add(syncableItemKey(entityName, entityTypeUuid));
            });
        });
        const checkpoints = entitySyncStatusService.findAll().map(_.identity)
            .filter(({entityName, entityTypeUuid}) => !_.isEmpty(entityTypeUuid) &&
                (removedTypeUuids.has(entityTypeUuid) || staleKeys.has(syncableItemKey(entityName, entityTypeUuid))))
            .map(({uuid, entityName, entityTypeUuid}) =>
                ({uuid, entityName, entityTypeUuid, loadedSince: EntitySyncStatus.REALLY_OLD_DATE}));
        if (!_.isEmpty(checkpoints)) entitySyncStatusService.updateAsPerSyncDetails(checkpoints);
    });

    return {reconciled: true, removedSubjectTypes: _.map(removedSubjectTypes, 'uuid')};
}
