import Service from "../framework/bean/Service";
import ConventionalRestClient from "./rest/ConventionalRestClient";
import BaseService from "./BaseService";
import EntityService from "./EntityService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import SettingsService from "./SettingsService";
import EntitySyncStatus from "../models/EntitySyncStatus";
import _ from "lodash";

@Service("syncService")
class SyncService extends BaseService {
    //Push all tx data
    //Check app updates
    //Get metadata/configuration
    //Get txdata for the catchment

    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.entityService = this.getService(EntityService);
        this.conventionalRestClient = new ConventionalRestClient(this.getService(SettingsService));
    }

    sync(allEntitiesMetaData) {
        this.syncAllMetadataAndReferenceData(allEntitiesMetaData);
    }

    syncAllMetadataAndReferenceData(allEntitiesMetaData) {
        this.syncMetadataAndReferenceData(allEntitiesMetaData.slice());
    }

    syncMetadataAndReferenceData(workingAllEntitiesMetaData) {
        var entityMetaData = workingAllEntitiesMetaData.pop();
        if (_.isNil(entityMetaData)) return;

        var entitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName);

        this.conventionalRestClient.loadData(entityMetaData, entitySyncStatus.loadedSince, 0,
            workingAllEntitiesMetaData,
            (resourcesWithSameTimeStamp, entityModel) => this.persistSynchedReferenceEntities(resourcesWithSameTimeStamp, entityModel),
            (entityMetaData, workingAllEntitiesMetaData) => this.syncMetadataAndReferenceData(entityMetaData, workingAllEntitiesMetaData), []);
    }

    persistSynchedReferenceEntities(resourcesWithSameTimeStamp, entityModel) {
        resourcesWithSameTimeStamp.forEach((resource) => {
            var entity = entityModel.entityClass.create(resource);
            this.entityService.saveOrUpdate(entity, entityModel.entityName);
        });

        console.log(`Saved: ${resourcesWithSameTimeStamp.length} entities`);

        var currentEntitySyncStatus = this.entitySyncStatusService.get(entityModel.entityName);

        var entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.name = entityModel.entityName;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(resourcesWithSameTimeStamp[0]["lastModifiedDateTime"]);
        console.log(`Saving: ${entitySyncStatus}`);
        this.entitySyncStatusService.saveOrUpdate(entitySyncStatus);
    }
}

export default SyncService;