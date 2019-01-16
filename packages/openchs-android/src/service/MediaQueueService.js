import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {MediaQueue} from "openchs-models";

@Service("mediaQueueService")
class MediaQueueService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    fileExistsInQueue(fileName) {
        return this.db.objects(MediaQueue.schema.name).filtered(`fileName == '${fileName}'`).length > 0;
    }

    addToQueue(entity, schemaName, fileName) {
        console.log('adding file ', fileName)
        !this.fileExistsInQueue(fileName) &&
        this.db.write(() => {
            this.db.create(MediaQueue.schema.name, MediaQueue.create(schemaName, entity.uuid, fileName, ''));
        });
    }

    addMediaToQueue(entity, schemaName) {
        console.log('adding media to queue')
        _.forEach(entity.findMediaObservations(), (observation) => this.addToQueue(entity, schemaName, observation.getValue()))
    }
}

export default MediaQueueService;
