class MediaQueue {
    static schema = {
        name: 'MediaQueue',
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            entityName: 'string',
            fileName: 'string',
            url: 'string',
            type: 'string',
        }
    };

    static create(entityName, uuid, fileName, url, type) {
        var mediaQueue = new MediaQueue();
        mediaQueue.uuid = uuid;
        mediaQueue.entityName = entityName;
        mediaQueue.fileName = fileName;
        mediaQueue.url = url;
        mediaQueue.type = type;
        return mediaQueue;
    }
}

export default MediaQueue;
