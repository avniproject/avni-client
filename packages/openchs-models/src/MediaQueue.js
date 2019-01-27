import General from "./utility/General";

class MediaQueue {
    static schema = {
        name: 'MediaQueue',
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            entityUUID: "string",
            entityName: 'string',
            fileName: 'string',
            type: 'string',
        }
    };

    static create(entityUUID, entityName, fileName, type, uuid = General.randomUUID()) {
        var mediaQueue = new MediaQueue();
        mediaQueue.entityUUID = entityUUID;
        mediaQueue.uuid = uuid;
        mediaQueue.entityName = entityName;
        mediaQueue.fileName = fileName;
        mediaQueue.type = type;
        return mediaQueue;
    }

    clone() {
        const mediaQueueItem = new MediaQueue();
        mediaQueueItem.uuid = this.uuid;
        mediaQueueItem.entityUUID = this.entityUUID;
        mediaQueueItem.entityName = this.entityName;
        mediaQueueItem.fileName = this.fileName;
        mediaQueueItem.type = this.type;
        return mediaQueueItem;
    }
}

export default MediaQueue;
