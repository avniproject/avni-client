class EntityQueue {
    static schema = {
        name: 'EntityQueue',
        properties: {
            savedAt: "date",
            entityUUID: "string",
            entity: "string"
        }
    };

    static create(entity, schema) {
        var entityQueue = new EntityQueue();
        entityQueue.entityUUID = entity.uuid;
        entityQueue.entity = schema;
        entityQueue.savedAt = new Date();
        return entityQueue;
    }
}

export default EntityQueue;