import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import _ from "lodash";

@Service("entityService")
class EntityService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        throw "Should not call getSchema on Entity Service";
    }

    saveOfUpdateMultiple(entities) {
        const db = this.db;
        this.db.write(() => {
            entities.forEach((entity) => {
                db.create(schema, entity, true)
            });
        });
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
}

export default EntityService;