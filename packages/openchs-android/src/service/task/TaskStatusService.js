import _ from "lodash";
import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {TaskStatus} from 'openchs-models';

@Service("taskStatusService")
class TaskStatusService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return TaskStatus.schema.name;
    }

    getAllForTaskType(taskType) {
        return this.getAllNonVoided().filtered("taskType.uuid = $0", taskType.uuid).map(_.identity);
    }
}

export default TaskStatusService;
