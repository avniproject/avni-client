import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityMetaData, EntityQueue, MediaQueue} from "openchs-models";
import _ from "lodash";

@Service("entityQueueService")
class EntityQueueService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.getAllQueuedItems = this.getAllQueuedItems.bind(this);
        this.popItem = this.popItem.bind(this);
    }

    getSchema() {
        return EntityQueue.schema.name;
    }

    requeueAll() {
        this.clearDataIn([EntityQueue]);
        const allTxEntityQueue = EntityMetaData.model().filter((entityMetaData) => entityMetaData.type === "tx")
            .slice()
            .reverse()
            .map((entityModel) => this.findAll(entityModel.entityName)
                .map(e => EntityQueue.create(e, entityModel.entityName)))
            .reduce((acc, entityQueue) => acc.concat(entityQueue), []);
        this.bulkSaveOrUpdate(this.createEntities(EntityQueue.schema.name, allTxEntityQueue));
    }

    getAllQueuedItems(entityMetadata) {
        const items = _.uniqBy(this.db.objects(EntityQueue.schema.name)
            .filtered("entity = $0", entityMetadata.entityName)
            .sorted("savedAt")
            .slice(), 'entityUUID');
        const getEntity = ({entityUUID, entity}) => this.findByKey("uuid", entityUUID, entity);
        return {
            metaData: entityMetadata,
            entities: items.map((item) => Object.assign({
                resource: getEntity(item).toResource
            }))
        };
    }

    getQueuedItemCount(entityName) {
        const allItems = this.db.objects(EntityQueue.schema.name);
        const entityItems = (entityName && allItems.filtered("entity = $0", entityName)) || allItems;
        return _.uniqBy(entityItems, 'entityUUID').length;
    }

    getTotalQueueCount() {
        return this.getQueuedItemCount() + this.db.objects(MediaQueue.schema.name).length;
    }

    popItem(uuid) {
        return () => {
            const itemToDelete = this.findByKey("entityUUID", uuid, EntityQueue.schema.name);
            this.db.write(() => this.db.delete(itemToDelete))
        };
    }
}

export default EntityQueueService;
