import EntitySyncStatus from "../models/EntitySyncStatus";

class SetupData {
    static setup(entitySyncStatusService) {
        entitySyncStatusService.save(EntitySyncStatus.create("Concept", EntitySyncStatus.REALLY_OLD_DATE));
        entitySyncStatusService.save(EntitySyncStatus.create("Gender", EntitySyncStatus.REALLY_OLD_DATE));
    }
}

export default SetupData;