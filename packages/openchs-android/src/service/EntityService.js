import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import _ from "lodash";
import {  Individual  } from 'openchs-models';
import {  EntityQueue  } from 'openchs-models';

@Service("entityService")
class EntityService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        throw "Should not call getSchema on Entity Service";
    }

    deleteObjects(uuid, schema, objectKey) {
        const db = this.db;
        this.db.write(() => {
            const savedFormElement = this.findByKey("uuid", uuid, schema);
            if (!_.isNil(savedFormElement)) {
                db.delete(savedFormElement[objectKey]);
            }
        });
    }

    saveAndPushToEntityQueue(entity, schema) {
        this.db.write(() => {
            this.db.create(schema, entity, true);
            this.db.create(EntityQueue.schema.name, EntityQueue.create(entity, schema));
        });
    }
}

export default EntityService;