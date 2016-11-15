import _ from "lodash";

class BaseService {
    constructor(db, beanStore) {
        this.db = db;
        this.beanStore = beanStore;
        this.init = this.init.bind(this);
    }

    init() {
    }

    getService(name) {
        return this.beanStore.getBean(name);
    }

    findByKey(keyName, keyValue, schema) {
        if (_.isNil(schema)) schema = this.getSchema();

        var entities = this.db.objects(schema).filtered(`${keyName}="${keyValue}"`);
        return entities.length === 1 ? entities[0] : undefined;
    }

    saveOrUpdate(entity, schema) {
        if (schema === undefined) schema = this.getSchema();

        const db = this.db;
        this.db.write(()=> db.create(schema, entity, true));
        return entity;
    }

    save(entity) {
        const db = this.db;
        this.db.write(()=> db.create(this.getSchema(), entity));
        return entity;
    }

    getAll(schema) {
        return this.db.objects(schema);
    }

    getSchema() {
        throw "getSchema should be overridden";
    }
}

export default BaseService;