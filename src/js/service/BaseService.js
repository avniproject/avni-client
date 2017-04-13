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

    findAllByKey(keyName, value, schemaName) {
        return this.findAllByCriteria(`${keyName}="${value}"`, schemaName);
    }

    findAllByCriteria(filterCriteria, schema) {
        if (_.isNil(schema)) schema = this.getSchema();
        return this.db.objects(schema).filtered(filterCriteria);
    }

    findByUUID(uuid, schema) {
        if (_.isEmpty(uuid)) throw Error("UUID is empty or null");
        if (_.isNil(schema)) schema = this.getSchema();

        return this.findByKey("uuid", uuid, schema);
    }

    findByCriteria(filterCriteria, schema) {
        const allEntities = this.findAllByCriteria(filterCriteria, schema);
        return this.getReturnValue(allEntities);
    }

    findByKey(keyName, value, schemaName) {
        const entities = this.findAllByKey(keyName, value, schemaName);
        return this.getReturnValue(entities);
    }

    getReturnValue(entities) {
        if (entities.length === 0) return undefined;
        if (entities.length === 1) return entities[0];
        return entities;
    }

    update(entity, schema) {
        this.saveOrUpdate(entity, schema);
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