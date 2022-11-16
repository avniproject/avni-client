import _ from "lodash";
import Service from "../../framework/bean/Service";
import BaseService from "../BaseService";
import {TaskType} from 'openchs-models';

@Service("taskTypeService")
class TaskTypeService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return TaskType.schema.name;
    }

    findAllByTaskType(taskTypeType) {
        return this.getAllNonVoided().filtered("type = $0", taskTypeType).map(_.identity);
    }
}

export default TaskTypeService;
