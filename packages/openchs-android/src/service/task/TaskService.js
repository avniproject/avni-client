import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {EntityQueue, ObservationsHolder, Task} from 'avni-models';
import General from "../../utility/General";

@Service("taskService")
class TaskService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Task.schema.name;
    }

    getIncompleteTasks(taskTypeName) {
        return this.getAllNonVoided()
            .filtered(`taskType.type = '${taskTypeName}' and completedOn = null`)
            .sorted('scheduledOn', true);
    }

    deleteTask(taskUUID, db) {
        const task = this.findByUUID(taskUUID);
        if (!_.isNil(task)) {
            db.delete(task);
        }
    }

    saveOrUpdate(task) {
        General.logDebug('TaskService', `Saving Task UUID: ${task.uuid}`);
        const db = this.db;
        ObservationsHolder.convertObsForSave(task.observations);
        ObservationsHolder.convertObsForSave(task.metadata);
        if (task.taskStatus.isTerminal) {
            task.setCompletedOn(new Date());
        }
        this.db.write(() => {
            db.create(Task.schema.name, task, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(task, Task.schema.name));
        });
    }

}


export default TaskService
