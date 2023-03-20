import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityQueue, MediaQueue, EntityMetaData} from 'openchs-models';
import _ from "lodash";
import bugsnag from "../utility/bugsnag";

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

    getAllQueuedItems(entityMetaData: EntityMetaData) {
        const items = _.uniqBy(this.db.objects(EntityQueue.schema.name)
            .filtered("entity = $0", entityMetaData.entityName)
            .sorted("savedAt")
            .slice(), 'entityUUID');

        const getEntity = ({entityUUID, entity}) => this.findByKey("uuid", entityUUID, entity);
        const getEntityResource = (item) => {
            const entity = getEntity(item);
            if (_.isNil(entity)) {
                bugsnag.notify(new Error(`Entity in EntityQueue can\'t be found. Details: ${JSON.stringify(item)}`));
                this.db.write(() => this.db.delete(item));
                return undefined;
            }
            return entity.toResource;
        };

        return {
            metaData: entityMetaData,
            entities: items.map((item) => _.assignIn({
                resource: getEntityResource(item)
            })).filter(resourceItem => !_.isNil(resourceItem.resource))
        };
    }

    getPresentEntities() {
        return this.db.objects(EntityQueue.schema.name).filtered("TRUEPREDICATE DISTINCT(entity)");
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
            if (_.isNil(itemToDelete)) {
                bugsnag.notify(new Error(`Item to delete is undefined in entityQueue. Details: ${uuid}`));
            } else {
                this.db.write(() => this.db.delete(itemToDelete));
            }
        };
    }
}

export default EntityQueueService;
