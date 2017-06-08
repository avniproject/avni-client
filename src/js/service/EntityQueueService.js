import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import EntityQueue from "../models/EntityQueue";
import _ from "lodash";

@Service("entityQueueService")
class EntityQueueService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return EntityQueue.schema.name;
    }

    getNextQueuedItem(entityQueueItemName) {
        const topQueueItem = this._getTopQueueItem(entityQueueItemName);
        if (_.isNil(topQueueItem)) {
            return null;
        }

        const entity = this.findByKey("uuid", topQueueItem.entityUUID, topQueueItem.entity);
        return {entity: entity, entityName: topQueueItem.entity};
    }

    popTopQueueItem(entityQueueItemName) {
        this.db.write(() => {
            const topQueueItem = this._getTopQueueItem(entityQueueItemName);
            if (!_.isNil(topQueueItem)) {
                this.db.delete(topQueueItem);
            }
        });
    }

    _getTopQueueItem(entityQueueItemName) {
        const queueItems = this.db.objects(EntityQueue.schema.name).filtered(`entity="${entityQueueItemName}"`).sorted("savedAt").slice(0, 1);
        if (queueItems.length === 1) {
            return queueItems[0];
        }
        return null;
    }
}

export default EntityQueueService;