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

    deleteNonMigratedTasks() {
        const db = this.db;
        this.findAll()
            .filtered('hasMigrated = false')
            .map(_.identity)
            .forEach(unAssignment => {
                this.db.write(() => {
                    this.getService(TaskService).deleteTask(unAssignment.taskUUID, db);
                    db.create(this.getSchema(), unAssignment.updatedHasMigrated(), true);
                });
            })
    }

}


export default TaskUnAssignmentService
