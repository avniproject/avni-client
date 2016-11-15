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
    //Save txdata
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
        const allReferenceDataMetaData = _.filter(allEntitiesMetaData, (entityMetaData) => {
            return entityMetaData.type === "reference";
        });
        const allTxDataMetaData = _.filter(allEntitiesMetaData, (entityMetaData) => {
            return entityMetaData.type === "tx";
        });
        this.pullData(allReferenceDataMetaData, () => this.pullData(allTxDataMetaData));
    }

    pullData(unprocessedEntityMetaData, onComplete) {
        var entityMetaData = unprocessedEntityMetaData.pop();
        if (_.isNil(entityMetaData)) onComplete();

        var entitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName);

        this.conventionalRestClient.loadData(entityMetaData, entitySyncStatus.loadedSince, 0,
            unprocessedEntityMetaData,
            (resourcesWithSameTimeStamp, entityModel) => this.persist(resourcesWithSameTimeStamp, entityModel),
            (entityMetaData, workingAllEntitiesMetaData) => this.pullData(entityMetaData, workingAllEntitiesMetaData), []);
    }

    persist(resourcesWithSameTimeStamp, entityModel) {
        resourcesWithSameTimeStamp.forEach((resource) => {
            var entity = entityModel.entityClass.fromResource(resource, this.getService(EntityService));
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