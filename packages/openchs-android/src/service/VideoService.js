import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Video} from "openchs-models";

@Service("videoService")
class VideoService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Video.schema.name;
    }

    getAll = () => {
        return super.getAll(Video.schema.name).map(_.identity).filter(this.unVoided);
    };
}

export default VideoService;
