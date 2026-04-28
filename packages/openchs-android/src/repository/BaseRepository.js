class BaseRepository {
    query() {
        throw new Error("query() not implemented");
    }

    findAll() {
        throw new Error("findAll() not implemented");
    }

    findByUuid(uuid) {
        throw new Error("findByUuid() not implemented");
    }

    findByKey(keyName, value) {
        throw new Error("findByKey() not implemented");
    }

    findAllByKey(keyName, value) {
        throw new Error("findAllByKey() not implemented");
    }

    findAllByCriteria(filterString) {
        throw new Error("findAllByCriteria() not implemented");
    }

    filtered(...args) {
        throw new Error("filtered() not implemented");
    }

    save(entity) {
        throw new Error("save() not implemented");
    }

    saveOrUpdate(entity) {
        throw new Error("saveOrUpdate() not implemented");
    }

    bulkSaveOrUpdate(entities) {
        throw new Error("bulkSaveOrUpdate() not implemented");
    }

    create(entity, updateMode) {
        throw new Error("create() not implemented");
    }

    delete(objectOrObjects) {
        throw new Error("delete() not implemented");
    }

    deleteInTransaction(objectOrObjects) {
        throw new Error("deleteInTransaction() not implemented");
    }

    objectForPrimaryKey(key) {
        throw new Error("objectForPrimaryKey() not implemented");
    }

    count() {
        throw new Error("count() not implemented");
    }

    getAllNonVoided() {
        throw new Error("getAllNonVoided() not implemented");
    }

    existsByUuid(uuid) {
        throw new Error("existsByUuid() not implemented");
    }

    /**
     * Re-persist mutations made to a managed entity inside a transaction.
     *
     * Realm's live objects auto-persist field assignments and list mutations
     * inside a write block, so the implementation there is a no-op. SQLite's
     * "managed" objects are plain JS copies, so any mutation needs an explicit
     * upsert. Use this where a service mutates a fetched entity in-place and
     * needs the change to land on disk regardless of backend.
     */
    persistMutations(entity) {
        throw new Error("persistMutations() not implemented");
    }
}

export default BaseRepository;
