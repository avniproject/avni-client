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
    //Pull metadata
    //Pull configuration
    //Pull txdata for the catchment

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

        var onCompleteFn = () => {};
        var pullTxDataFn = () => this.pullData(allTxDataMetaData, onCompleteFn);
        var pullConfigurationFn = () => this.pullConfiguration(pullTxDataFn);
        var pullReferenceDataFn = () => this.pullData(allReferenceDataMetaData, pullConfigurationFn);
        var pushTxDataFn = () => this.pushTxData(allTxDataMetaData, pullReferenceDataFn);

        pushTxDataFn();
    }

    pullConfiguration(onComplete) {
        onComplete();
    }

    pullData(unprocessedEntityMetaData, onComplete) {
        var entityMetaData = unprocessedEntityMetaData.pop();
        if (_.isNil(entityMetaData)) {
            onComplete();
            return;
        }

        var entitySyncStatus = this.entitySyncStatusService.get(entityMetaData.entityName);
        console.log(`${entitySyncStatus.entityName} was last loaded up to "${entitySyncStatus.loadedSince}"`);
        this.conventionalRestClient.loadData(entityMetaData, entitySyncStatus.loadedSince, 0,
            unprocessedEntityMetaData,
            (resourcesWithSameTimeStamp, entityModel) => this.persist(resourcesWithSameTimeStamp, entityModel),
            (workingAllEntitiesMetaData) => this.pullData(workingAllEntitiesMetaData, onComplete),
            []);
    }

    persist(resourcesWithSameTimeStamp, entityModel) {
        resourcesWithSameTimeStamp.forEach((resource) => {
            var entity = entityModel.entityClass.fromResource(resource, this.getService(EntityService));
            this.entityService.saveOrUpdate(entity, entityModel.entityName);
        });

        var currentEntitySyncStatus = this.entitySyncStatusService.get(entityModel.entityName);

        var entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.name = entityModel.entityName;
        entitySyncStatus.uuid = currentEntitySyncStatus.uuid;
        entitySyncStatus.loadedSince = new Date(resourcesWithSameTimeStamp[0]["lastModifiedDateTime"]);
        this.entitySyncStatusService.saveOrUpdate(entitySyncStatus);
    }

    pushTxData(allTxDataMetaData, onComplete) {
        onComplete();
    }
}

export default SyncService;