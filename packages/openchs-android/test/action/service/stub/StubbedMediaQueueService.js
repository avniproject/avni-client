import StubbedBaseService from "./StubbedBaseService";

class StubbedMediaQueueService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    addMediaToQueue(entity, schemaName) {
    }
}

export default StubbedMediaQueueService;
