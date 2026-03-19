import _ from 'lodash';
import BaseRepository from './BaseRepository';
import RealmQueryBuilder from './RealmQueryBuilder';

class RealmRepository extends BaseRepository {
    constructor(db, schemaName) {
        super();
        this.db = db;
        this.schemaName = schemaName;
    }

    query() {
        return new RealmQueryBuilder(this.findAll());
    }

    findAll() {
        return this.db.objects(this.schemaName);
    }

    findByUuid(uuid) {
        if (_.isEmpty(uuid)) return null;
        const results = this.findAll().filtered('uuid = $0', uuid);
        return results.length > 0 ? results[0] : null;
    }

    findByKey(keyName, value) {
        const results = this.findAllByKey(keyName, value);
        if (results.length === 0) return null;
        if (results.length === 1) return results[0];
        return results;
    }

    findAllByKey(keyName, value) {
        return this.findAllByCriteria(`${keyName}="${value}"`);
    }

    findAllByCriteria(filterString) {
        return this.findAll().filtered(filterString);
    }

    filtered(...args) {
        return this.findAll().filtered(...args);
    }

    save(entity) {
        const db = this.db;
        this.db.write(() => db.create(this.schemaName, entity));
        return entity;
    }

    saveOrUpdate(entity) {
        const db = this.db;
        this.db.write(() => db.create(this.schemaName, entity, true));
        return entity;
    }

    bulkSaveOrUpdate(entities) {
        const db = this.db;
        this.db.write(() => {
            entities.forEach(entity => db.create(this.schemaName, entity, true));
        });
    }

    create(entity, updateMode) {
        return this.db.create(this.schemaName, entity, updateMode);
    }

    delete(objectOrObjects) {
        const db = this.db;
        this.db.write(() => {
            db.delete(objectOrObjects);
        });
    }

    deleteInTransaction(objectOrObjects) {
        this.db.delete(objectOrObjects);
    }

    objectForPrimaryKey(key) {
        return this.db.objectForPrimaryKey(this.schemaName, key);
    }

    count() {
        return this.findAll().length;
    }

    getAllNonVoided() {
        return this.findAll().filtered("voided = false");
    }

    existsByUuid(uuid) {
        return _.isEmpty(uuid) ? false : this.findAll().filtered('uuid = $0', uuid).length > 0;
    }

    updateDatabase(db) {
        this.db = db;
    }
}

export default RealmRepository;
