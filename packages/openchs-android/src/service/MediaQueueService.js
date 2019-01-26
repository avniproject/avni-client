import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {MediaQueue} from "openchs-models";

@Service("mediaQueueService")
class MediaQueueService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema () {
        return MediaQueue.schema.name;
    }

    fileExistsInQueue(fileName) {
        return this.getAll().filtered(`fileName == '${fileName}'`).length > 0;
    }

    addToQueue(entity, schemaName, fileName, type) {
        if(!this.fileExistsInQueue(fileName)) {
            this.saveOrUpdate(MediaQueue.create(schemaName, entity.uuid, fileName, '', type));
        }
    }

    addMediaToQueue(entity, schemaName) {
        _.forEach(entity.findMediaObservations(), (observation) => {
            this.addToQueue(entity, schemaName, observation.getValue(), observation.concept.datatype)
        });
    }
}

export default MediaQueueService;
