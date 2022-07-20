import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {Task} from 'avni-models';

@Service("taskService")
class TaskService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Task.schema.name;
    }

    getIncompleteTasks() {
        return this.getAllNonVoided().filtered('completedOn = null');
    }

    deleteTask(taskUUID, db) {
        const task = this.findByUUID(taskUUID);
        if (task) {
            db.delete(task);
        }
    }

}


export default TaskService
