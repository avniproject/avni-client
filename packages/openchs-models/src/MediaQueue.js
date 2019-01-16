class MediaQueue {
    static schema = {
        name: 'MediaQueue',
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            entityName: 'string',
            fileName: 'string',
            url: 'string',
        }
    };

    static create(entityName, uuid, fileName, url) {
        var mediaQueue = new MediaQueue();
        mediaQueue.uuid = uuid;
        mediaQueue.entityName = entityName;
        mediaQueue.fileName = fileName;
        mediaQueue.url = url;
        return mediaQueue;
    }
}

export default MediaQueue;
