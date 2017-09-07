import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import EntityQueue from "../models/EntityQueue";
import _ from "lodash";
import EntitySyncStatus from "../models/EntitySyncStatus";

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

    popItem(uuid) {
        const itemToDelete = this.findByKey("entityUUID", uuid, EntityQueue.schema.name);
        this.db.write(() => this.db.delete(itemToDelete));
    }
}

export default EntityQueueService;