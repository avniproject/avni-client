import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityMetaData, ResetSync, EntityMappingConfig, Settings, UserInfo} from "openchs-models";
import EntitySyncStatusService from "./EntitySyncStatusService";
import _ from 'lodash';
import SubjectMigrationService from "./SubjectMigrationService";
import IndividualService from "./IndividualService";
import General from "../utility/General";
import BackupRestoreRealmService from "./BackupRestoreRealmService";

@Service('ResetSyncService')
class ResetSyncService extends BaseService {

    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.subjectMigrationService = this.getService(SubjectMigrationService);
        this.individualService = this.getService(IndividualService);
        this.backupRestoreRealmService = this.getService(BackupRestoreRealmService);
    }

    getSchema() {
        return ResetSync.schema.name;
    }

    getNotMigratedResetSyncs() {
        return this.getAllNonVoided().filtered('hasMigrated = false').map(_.identity);
    }

    isResetSyncRequired() {
        const isFreshSync = this.backupRestoreRealmService.isDatabaseNeverSynced();
        if (isFreshSync) {
            // No change required as it's fresh sync
            this.markAllResetSyncsMigrated();
            return false;
        }
        return _.size(this.getNotMigratedResetSyncs()) > 0;
    }

    markAllResetSyncsMigrated() {
        _.forEach(this.getNotMigratedResetSyncs(), resetSync => this._updateHasMigrated(resetSync));
    }

    resetSync() {
        if (!this.isResetSyncRequired()) return;
        const notMigratedSyncReset = this.getNotMigratedResetSyncs();
        const isAllDataDeleteRequired = _.some(notMigratedSyncReset, resetSnc => _.isNil(resetSnc.subjectTypeUUID));
        if (isAllDataDeleteRequired) {
            General.logDebug('ResetSyncService', `Deleting all data and resetting the sync`);
            const allEntities = _.filter(EntityMappingConfig.getInstance().getEntities(),
              entity => {
                  return !(entity.schema.embedded ||
                    _.includes([Settings.schema.name, UserInfo.schema.name, ResetSync.schema.name], entity.schema.name));
              });
            // ResetSync rows survive the wipe but their checkpoint does not: EntitySyncStatus
            // is inside allEntities, and setup() re-seeds every missing checkpoint at
            // REALLY_OLD_DATE. That makes every later sync re-pull the user's whole reset
            // history — the reset we have just honoured included. Read the checkpoint's
            // values out now, while the row is still alive, and put them back before setup()
            // so it finds a row and leaves it alone, keeping the original uuid.
            const resetSyncCheckpoint = this._copyOfCheckpointFor(ResetSync.schema.name);
            this.clearDataIn(allEntities);
            if (resetSyncCheckpoint) this.entitySyncStatusService.updateAsPerSyncDetails([resetSyncCheckpoint]);
            this.entitySyncStatusService.setup();
            this.markAllResetSyncsMigrated();
        } else {
            _.forEach(notMigratedSyncReset, (resetSync) => {
                if (_.isEmpty(resetSync)) return;
                const subjectTypeUUID = resetSync.subjectTypeUUID;
                General.logDebug('ResetSyncService', `Deleting data and resetting the sync for subject type uuid ${subjectTypeUUID}`);
                this.entitySyncStatusService.deleteEntries(`entityTypeUuid = '${subjectTypeUUID}'`);
                const allSubjects = this.individualService.findAll().filtered(`subjectType.uuid = $0`, subjectTypeUUID).map(_.identity);
                _.forEach(allSubjects, subject => this.subjectMigrationService.deleteSubjectAndChildren(subject));
                this._updateHasMigrated(resetSync);
            });
        }
    }

    // Plain values, not the live row — clearDataIn deletes it a moment later and reading
    // a deleted Realm object throws.
    _copyOfCheckpointFor(entityName) {
        const checkpoint = this.entitySyncStatusService.get(entityName);
        if (_.isNil(checkpoint)) return null;
        return {
            uuid: checkpoint.uuid,
            entityName: checkpoint.entityName,
            entityTypeUuid: checkpoint.entityTypeUuid,
            loadedSince: checkpoint.loadedSince
        };
    }

    _updateHasMigrated(resetSync) {
        if (resetSync) {
            const migratedResetSync = resetSync.updatedHasMigrated();
            this.update(migratedResetSync);
        }
    }
}

export default ResetSyncService
