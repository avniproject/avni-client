import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {TaskUnAssignment} from 'avni-models';
import _ from 'lodash';
import TaskService from "./TaskService";

@Service("taskUnAssignmentService")
class TaskUnAssignmentService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return TaskUnAssignment.schema.name;
    }

    deleteUnassignedTasks(taskUnAssignments) {
        _.forEach(taskUnAssignments, (taskUnAssignment) => {
            this.transactionManager.write(() => {
                this.getService(TaskService).deleteTask(taskUnAssignment.taskUUID);
                taskUnAssignment.hasMigrated = true;
                this.repository.create(taskUnAssignment, true);
            });
        });
    }

}


export default TaskUnAssignmentService
