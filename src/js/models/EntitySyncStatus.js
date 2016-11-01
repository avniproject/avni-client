class EntitySyncStatus {
    static REALLY_OLD_DATE = new Date('1900-01-01');

    static schema = {
        name: 'EntitySyncStatus',
        properties: {
            entityName: 'string',
            loadedSince: 'date'
        }
    };

    static create(entityName, date) {
        var entitySyncStatus = new EntitySyncStatus();
        entitySyncStatus.entityName = entityName;
        entitySyncStatus.loadedSince = date;
        return entitySyncStatus;
    }
}

export default EntitySyncStatus;