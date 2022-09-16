// @flow
import _ from "lodash";
import General from "../utility/General";

/*
All methods with entity/entities in their name are to be used for disconnected objects. The ones without these terms are for connected objects.
For more read here.
 */
class BaseService {
    constructor(db, context) {
        this.db = db;
        this.context = context;
        this.init = this.init.bind(this);
        this.createEntities = this.createEntities.bind(this);
        this.bulkSaveOrUpdate = this.bulkSaveOrUpdate.bind(this);
    }

    setReduxStore(store) {
        this.reduxStore = store;
    }

    dispatchAction(action, params) {
        const type = action instanceof Function ? action.Id : action;
        if (General.canLog(General.LogLevel.Debug))
            General.logDebug('BaseService', `Dispatching action: ${JSON.stringify(type)}`);
        return this.reduxStore.dispatch({type, ...params});
    }

    updateDatabase(db) {
        this.db = db;
    }

    init() {
    }

    getService(name) {
        return this.context.getService(name);
    }

    getServerUrl() {
        const settingsService = this.getService("settingsService");
        return settingsService.getSettings().serverURL;
    }

    findAllByKey(keyName, value, schemaName) {
        return this.findAllByCriteria(`${keyName}="${value}"`, schemaName);
    }

    findAllByCriteria(filterCriteria, schema = this.getSchema()) {
        return this.findAll(schema).filtered(filterCriteria);
    }

    findAll(schema = this.getSchema()) {
        return this.db.objects(schema);
    }

    findOnly(schema) {
        const all = this.findAll(schema);
        return all.length === 0 ? null : all[0];
    }

    findByUUID(uuid, schema = this.getSchema()) {
        if (!_.isEmpty(uuid)) {
            return this.findByKey("uuid", uuid, schema);
        }
        General.logError('BaseService', `Entity ${schema}{uuid=${uuid},..} not found`);
    }

    findByCriteria(filterCriteria, schema) {
        const allEntities = this.findAllByCriteria(filterCriteria, schema);
        return this.getReturnValue(allEntities);
    }

    findByKey(keyName, value, schemaName = this.getSchema()) {
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
        if (schema === undefined) schema = this.getSchema();
        return this.db.objects(schema);
    }

    getCount(schema) {
        return this.getAll(schema).length;
    }

    getAllNonVoided(schema = this.getSchema()) {
        return this.db.objects(schema).filtered("voided = false");
    }

    getSchema() {
        throw "getSchema should be overridden";
    }

    clearDataIn(entities) {
        const db = this.db;

        entities.forEach((entity) => {
            General.logDebug("BaseService", `Deleting all data from ${entity.schema.name}`);
            db.write(() => {
                var objects = db.objects(entity.schema.name);
                db.delete(objects);
            });
        });
    }

    unVoided(item) {
        return !_.get(item, 'voided');
    }

    runInTransaction(fn) {
        if (this.db.isInTransaction) {
            return fn();
        }
        return this.db.write(fn);
    }

    existsByUuid(uuid, schema = this.getSchema()) {
        return _.isEmpty(uuid) ? false : this.db.objects(schema).filtered('uuid = $0', uuid).length > 0;
    }

    filtered(...args) {
        return this.db.objects(this.getSchema()).filtered(...args);
    }

    filterBy(fn) {
        const result = [];
        this.getAll().forEach(it => fn(it) && result.push(it));
        return result;
    }

    findUniqBy(fn: Function) {
        const result = this.filterBy(fn);
        if (result.length === 1) return result[0];
    }
}

export default BaseService;
