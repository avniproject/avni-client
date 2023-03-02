import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityMetaData, ResetSync, EntityMappingConfig, Settings, UserInfo} from "openchs-models";
import EntitySyncStatusService from "./EntitySyncStatusService";
import _ from 'lodash';
import SubjectMigrationService from "./SubjectMigrationService";
import IndividualService from "./IndividualService";
import General from "../utility/General";
import BackupRestoreRealmService from "./BackupRestoreRealm";

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
            _.forEach(this.getNotMigratedResetSyncs(), resetSync => this._updateHasMigrated(resetSync));
            return false;
        }
        return _.size(this.getNotMigratedResetSyncs()) > 0;
    }

    resetSync() {
        if (!this.isResetSyncRequired()) return;
        const notMigratedSyncReset = this.getNotMigratedResetSyncs();
        const isAllDataDeleteRequired = _.some(notMigratedSyncReset, resetSnc => _.isNil(resetSnc.subjectTypeUUID));
        if (isAllDataDeleteRequired) {
            General.logDebug('ResetSyncService', `Deleting all data and resetting the sync`);
            const allEntities = _.filter(EntityMappingConfig.getInstance().getEntities(), entity => !_.includes([Settings.schema.name, UserInfo.schema.name, ResetSync.schema.name], entity.schema.name));
            this.clearDataIn(allEntities);
            this.entitySyncStatusService.setup();
            _.forEach(notMigratedSyncReset, resetSync => this._updateHasMigrated(resetSync));
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

    _updateHasMigrated(resetSync) {
        if (resetSync) {
            const migratedResetSync = resetSync.updatedHasMigrated();
            this.update(migratedResetSync);
        }
    }
}

export default ResetSyncService
