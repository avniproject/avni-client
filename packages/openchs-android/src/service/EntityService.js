import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import _ from "lodash";
import {EntityQueue} from 'avni-models';

@Service("entityService")
class EntityService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        throw "Should not call getSchema on Entity Service";
    }

    deleteObjects(uuid, schema, objectKey) {
        this.transactionManager.write(() => {
            const entity = this.findByKey("uuid", uuid, schema);
            if (!_.isNil(entity) && !_.isEmpty(entity)) {
                this.getRepository(schema).deleteInTransaction(entity[objectKey]);
            }
        });
    }

    saveAndPushToEntityQueue(entity, schema) {
        this.transactionManager.write(() => {
            this.getRepository(schema).create(entity, true);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(entity, schema));
        });
    }

    deleteEntities(objects, schema) {
        this.transactionManager.write(() => {
            this.getRepository(schema).deleteInTransaction(objects);
        });
    }
}

export default EntityService;
