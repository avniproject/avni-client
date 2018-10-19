class EntityQueue {
    static schema = {
        name: 'EntityQueue',
        properties: {
            savedAt: "date",
            entityUUID: "string",
            entity: "string"
        }
    };

    static create(entity, schema, savedAt = new Date()) {
        var entityQueue = new EntityQueue();
        entityQueue.entityUUID = entity.uuid;
        entityQueue.entity = schema;
        entityQueue.savedAt = savedAt;
        return entityQueue;
    }
}

export default EntityQueue;