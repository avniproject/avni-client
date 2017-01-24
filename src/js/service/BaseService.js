import _ from "lodash";

class BaseService {
    constructor(db, context) {
        this.db = db;
        this.context = context;
        this.init = this.init.bind(this);
    }

    init() {
    }

    getService(name) {
        return this.context.getBean(name);
    }

    findByUUID(uuid, schema) {
        return this.findByKey("uuid", uuid, schema);
    }

    findByKey(keyName, value, schemaName) {
        if (_.isNil(schemaName)) schemaName = this.getSchema();

        const entities = this.db.objects(schemaName).filtered(`${keyName}="${value}"`);
        return entities.length === 1 ? entities[0] : undefined;
    }

    saveOrUpdate(entity, schema) {
        if (schema === undefined) schema = this.getSchema();

        const db = this.db;
        this.db.write(()=> db.create(schema, entity, true));
        return entity;
    }

    save(entity, schema) {
        if (schema === undefined) schema = this.getSchema();

        const db = this.db;
        this.db.write(()=> db.create(schema, entity));
        return entity;
    }

    getAll(schema) {
        return this.db.objects(schema);
    }

    getSchema() {
        throw "getSchema should be overridden";
    }

    clearDataIn(entities) {
        const db = this.db;

        entities.forEach((entity) => {
            console.log(`Deleting all data from ${entity.schema.name}`);
            db.write(() => {
                var objects = db.objects(entity.schema.name);
                db.delete(objects);
            });
        });
    }
}

export default BaseService;