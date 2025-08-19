// @flow
import _ from "lodash";
import General from "../utility/General";
import RealmQueryService from "./query/RealmQueryService";
import {Observation, Point} from "openchs-models";

/*
All methods with entity/entities in their name are to be used for disconnected objects. The ones without these terms are for connected objects.
For more read here.
 */
class BaseService {
    constructor(db, context) {
        this.db = db;
        this.context = context;
        this.init = this.init.bind(this);
        this.getCreateEntityFunctions = this.getCreateEntityFunctions.bind(this);
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

    findAllByUUID(uuids, schema) {
        if (uuids.length === 0) return [];
        return this.findAllByCriteria(RealmQueryService.orKeyValueQuery("uuid", uuids), schema).map(_.identity);
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

    findOnly(schema = this.getSchema()) {
        const all = this.loadAll(schema);
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

    findByFiltered(filter, value, schema = this.getSchema()) {
        return this.getReturnValue(this.findAll(schema).filtered(`${filter} = '${value}'`));
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

    getCreateEntityFunctions(schema, entities) {
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

    loadAll(schema = this.getSchema()) {
        return this.getAll(schema).map(_.identity);
    }

    getCount(schema) {
        return this.getAll(schema).length;
    }

    /**
     Loads all objects without materialising them into model. Ideal for displaying large list or for further filtering
     **/
    getAllNonVoided(schema = this.getSchema()) {
        return this.db.objects(schema).filtered("voided = false");
    }

    /**
     Loads all objects and also materialises them into model.
     **/
    loadAllNonVoided(schema = this.getSchema()) {
        return this.getAllNonVoided(schema).map(_.identity);
    }

    getSchema() {
        throw "getSchema should be overridden";
    }

    clearDataIn(entityTypes) {
        const db = this.db;

        entityTypes.forEach((entityType) => {
            General.logDebug("BaseService", `Deleting all data from ${entityType.schema.name}`);
            db.write(() => {
                db.delete(db.objects(entityType.schema.name));
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

    isNew(entity) {
        return _.isEmpty(entity.uuid) || !this.existsByUuid(entity.uuid);
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

    static orFilterCriteria(entities, path) {
        return entities.map((x) => `${path} = "${x.uuid}"`).join(" OR ");
    }

    getActualSchemaVersion() {
        return this.db.schemaVersion;
    }

    getUserInfo() {
        return this.getService("userInfoService").getUserInfo();
    }

    delete(objectOrObjects) {
        const db = this.db;
        this.db.write(() => {
            db.delete(objectOrObjects);
        });
    }

    deleteAll() {
        const db = this.db;
        const all = this.findAll(this.getSchema());
        this.db.write(() => {
            db.delete(all);
        });
    }

    getObservationCount() {
        return this.getCount(Observation.schema.name);
    }

    getPointCount() {
        return this.getCount(Point.schema.name);
    }
}

export default BaseService;
