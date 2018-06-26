import _ from "lodash";
import General from "../utility/General";

class BaseService {
    constructor(db, context) {
        this.db = db;
        this.context = context;
        this.init = this.init.bind(this);
        this.createEntities = this.createEntities.bind(this);
        this.bulkSaveOrUpdate = this.bulkSaveOrUpdate.bind(this);
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
        return this.findAll(schema).filtered(filterCriteria);
    }

    findAll(schema) {
        return this.db.objects(schema);
    }

    findOnly(schema) {
        const all = this.findAll(schema);
        return _.isEmpty(all) ? all : all[0];
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
        this.db.write(() => db.create(schema, entity, true));
        return entity;
    }

    bulkSaveOrUpdate(entities) {
        this.db.write(() => {
            entities.map((entity) => entity());
        });
    }

    createEntities(schema, entities) {
        return entities.map((entity) => () => {
            this.db.create(schema, entity, true)
        });
    }

    save(entity, schema) {
        if (schema === undefined) schema = this.getSchema();

        const db = this.db;
        this.db.write(() => db.create(schema, entity));
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
            General.logDebug(`Deleting all data from ${entity.schema.name}`);
            db.write(() => {
                var objects = db.objects(entity.schema.name);
                db.delete(objects);
            });
        });
    }

    unVoided(item) {
        return !_.get(item, 'voided');
    }
}

export default BaseService;