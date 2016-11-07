class EntitySyncStatus {
    static REALLY_OLD_DATE = new Date('1900-01-01');

    static schema = {
        name: 'EntitySyncStatus',
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            entityName: 'string',
            loadedSince: 'date'
        }
    };

    static create(entityName, date, uuid) {
        var entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.uuid = uuid;
        entitySyncStatus.entityName = entityName;
        entitySyncStatus.loadedSince = date;
        return entitySyncStatus;
    }
}

export default EntitySyncStatus;