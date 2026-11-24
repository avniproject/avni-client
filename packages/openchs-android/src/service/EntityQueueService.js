import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityQueue, MediaQueue, EntityMetaData, RuleFailureTelemetry, SyncTelemetry} from 'openchs-models';
import _ from "lodash";
import ErrorUtil from "../framework/errorHandling/ErrorUtil";

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
        const items = _.uniqBy(this.repository.findAll()
            .filtered("entity = $0", entityMetaData.entityName)
            .sorted("savedAt")
            .slice(), 'entityUUID');

        const getEntity = ({entityUUID, entity}) => this.findByKey("uuid", entityUUID, entity);
        const getEntityResource = (item) => {
            const entity = getEntity(item);
            if (_.isNil(entity)) {
                ErrorUtil.notifyBugsnag(new Error(`Entity in EntityQueue can\'t be found. Details: ${JSON.stringify(item)}`), "EntityQueueService");
                this.transactionManager.write(() => this.repository.deleteInTransaction(item));
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
        return this.repository.findAll().filtered("TRUEPREDICATE DISTINCT(entity)");
    }

    getQueuedItemCount(entityName) {
        const allItems = this.repository.findAll();
        const entityItems = (entityName && allItems.filtered("entity = $0", entityName)) || allItems;
        return _.uniqBy(entityItems, 'entityUUID').length;
    }

    getTotalQueueCount() {
        return this.getQueuedItemCount() + this.getRepository(MediaQueue.schema.name).findAll().length;
    }

    // Only what pushData actually drains. Rows outside this set never clear: Family is
    // queued by FamilyService but absent from EntityMetaData, RuleFailureTelemetry is
    // dropped on failure, and SyncTelemetry is pushed separately. Counting any of them
    // would permanently stall a migration that waits for the queue to empty.
    _pendingFieldDataItems() {
        const diagnosticEntities = [SyncTelemetry.schema.name, RuleFailureTelemetry.schema.name];
        const isPushable = (entityName) => {
            const entityMetaData = EntityMetaData.findByName(entityName);
            return !_.isNil(entityMetaData) && entityMetaData.type === 'tx'
                && !_.includes(diagnosticEntities, entityName);
        };
        return _.uniqBy(_.filter(this.repository.findAll(), ({entity}) => isPushable(entity)), 'entityUUID');
    }

    // Field data still waiting to reach the server — anything counted here exists only
    // in the current database, so read it before abandoning a backend. MediaQueue is
    // excluded: mediaSync drains it at the top of every sync, so whatever remains is a
    // dangling entry for a file the user deleted, kept deliberately and never clearable.
    getPendingFieldDataCount() {
        return this._pendingFieldDataItems().length;
    }

    getPendingFieldDataSummary() {
        return _.map(_.countBy(this._pendingFieldDataItems(), 'entity'),
            (count, entity) => `${entity}=${count}`).join(', ');
    }

    popItem(uuid) {
        return () => {
            const itemToDelete = this.findByKey("entityUUID", uuid, EntityQueue.schema.name);
            if (_.isNil(itemToDelete)) {
                ErrorUtil.notifyBugsnag(new Error(`Item to delete is undefined in entityQueue. Details: ${uuid}`), "EntityQueryService");
            } else {
                this.transactionManager.write(() => this.repository.deleteInTransaction(itemToDelete));
            }
        };
    }
}

export default EntityQueueService;
