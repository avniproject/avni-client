class SyncWorker {
    //Push all tx data
    //Check app updates
    //Get metadata/configuration
    //Get txdata for the catchment

    constructor(conventionalRestClient, entitySyncStatusService, entityService) {
        this.conventionalRestClient = conventionalRestClient;
        this.entitySyncStatusService = entitySyncStatusService;
        this.entityService = entityService;
    }

    sync(entityMetaDataModel) {
        this.syncMetadataAndReferenceData(entityMetaDataModel);
    }

    syncMetadataAndReferenceData(entityMetaDataModel) {
        entityMetaDataModel.forEach(function (element) {
            var entitySyncStatus = this.entitySyncStatusService.get(element.entityName);
            this.conventionalRestClient.loadData(entitySyncStatus.loadedSince, 0, this.persistSynchedReferenceEntity);
        });
    }

    persistSynchedReferenceEntity(resource, entityModel) {
        var entity = entityModel.entityClass.create(resource);
        this.entityService.save(entity, entityModel.entityClass);

        var entitySyncStatus = this.entitySyncStatusService.get(entityModel.entityName);
        entitySyncStatus.loadedSince = resource["lastModifiedDateTime"];
        this.entitySyncStatusService.save(entitySyncStatus);
    }
}

export default SyncWorker;